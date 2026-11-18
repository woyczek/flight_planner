// V3 missions — l'éditeur de missions (SOG-0287, maquette validée le 13 nov. 2026 : modules/missions/maquette/), le calcul pur. Ni
// page, ni stockage, ni réseau : le document de la mission (déjà lu par js-yaml, schéma CORE : les dates restent des textes), les lignes
// du registre (frame/lib/mission.js readRegistry), le document du registre. Le fichier lu est une entrée non fiable (audit 157) : seuls
// les champs de l'étape éditée sont retouchés, bornés ; tout le reste du document est gardé tel quel.
//
// API :
//   STEPS : les six étapes de la maquette (Cadre, Équipes, Lieux, Récit, Risques, Chronologie et cartes) ; OPEN : celles qui s'éditent
//     déjà (les autres suivent, une par push).
//   teamsOf(doc) → [{ i, name, service, type, role }] (i : la place dans doc.teams, -1 pour une ligne ajoutée) ; withTeams(doc, rows) →
//     un NOUVEAU document : chaque équipe gardée garde ses autres clés, une ligne vide est retirée ; TEAMS_MAX lignes au plus.
//   placesOf(doc) → [{ kind: dep|arr|target|zone|pt|rdv|object, i, id, name, role, lat, lon, (zone) zkind, radius, tot, poly, (rdv)
//     participants, (object : un objet à trouver de `objects`, SOG-0445) okind, range, height, alt, confirm, moving }] : les nombres
//     en texte, pour les champs ; un objet est caché au pilote tant qu'un tiroir qui le cite est fermé (la lecture le cache) ; une
//     cible mobile (`moving`) garde sa route et sa vitesse telles quelles ; withPlaces(doc, rows) → un NOUVEAU document : la cible, les zones, les
//     points tournants et les rendez-vous réécrits depuis les lignes (chaque lieu gardé garde ses autres clés, un polygone ses points),
//     la position seule du départ et de l'arrivée ; une coordonnée vide ou hors bornes s'écrit null (« à placer », la forme de la V2).
//   storyOf(doc) → { summary, description, primary, secondary (une ligne par objectif), payload, mass, pax } ; withStory(doc, story) →
//     un NOUVEAU document : summary, detailed_description, objectives.{ primary, secondary }, payload.{ description, mass_kg,
//     passengers } (les autres clés de objectives et de payload gardées) ; SUMMARY_MAX : la longueur conseillée du résumé (600, la
//     coupe de la synthèse, SOG-0291) — un résumé plus long n'est jamais coupé à l'écriture.
//   risksOf(doc) → [{ i, hazard, consequence, mitigation }] ; withRisks(doc, rows) → un NOUVEAU document : la forme du prompt de la V2
//     (hazard, consequence, mitigation ; pas de niveau, la V2 n'en lit pas) ; un risque sans danger est retiré ; un risque retiré l'est
//     aussi de i18n.<langue>.risks (« même ordre que risks ») ; RISKS_MAX lignes.
//   eventsOf(doc) → [{ i, at, place, text }] (timeline.events, la forme de shared/mission_exercise.js : « H+30mn », un lieu de la
//     mission ou rien, ce qui se passe) ; withEvents(doc, rows) → un NOUVEAU document (les autres clés de timeline gardées).
//   mapsOf(doc) → [{ id, type, description, ref, unplaced }] ; proposedMaps(doc) → les cartes attendues d'après les lieux et absentes
//     (la règle de la V2) ; withMaps(doc, add) → les cartes ajoutées à la fin (des entrées : les images se font au studio de la V2).
//   Les références aux lieux (SOG-0439) : refsOf(doc) → [{ id, where, name }] (route_order, le déclenchement et la route d'une partie,
//     sa clé écrite par identifiant — la zone de passage, le point d'une arrivée ou d'une condition, ses arrêts : SOG-0445 —,
//     le centre d'une carte, le lieu d'un événement, le profil vertical, la route d'une alerte) ; withRefs(doc, base, rows) → le document
//     dont les références suivent les lieux renommés ou retirés — la DERNIÈRE retouche, après toutes les étapes ; refNow(id, base, rows)
//     → l'identifiant d'aujourd'hui d'une référence du fichier ; citedBy(doc, rows, i) → qui cite le lieu d'une ligne ; removePlace(rows,
//     i, doc, asked, sinceMs) → { rows, ask, cited, wait } : « Retirer » en deux temps quand le lieu est cité (le premier appui dit qui le
//     cite, le second le retire, inerte pendant REMOVE_ARM_MS) ; nextPlaceId(rows, kind, base) → un identifiant libre pour un lieu neuf (« PT3 ») ;
//     les gestes de la carte de l'atelier (SOG-0444, lot P2) : newPlace(rows, kind, base, at) → { rows, at } | null — une ligne neuve à
//     la place de sa sorte, située si `at` ({ lat, lon, radius }) le dit ; movePlace(rows, i, { lat, lon }) et placeRadius(rows, i, km)
//     → de NOUVELLES lignes, ou les mêmes quand le geste est refusé (départ, arrivée, contour, position ou rayon hors bornes : jamais
//     ramenés dans leurs bornes) ; MOVABLE : les sortes qu'un geste déplace ; RADIUS_KM : les bornes du rayon d'une zone ;
//     le contour d'une zone (troisième brique) : sa ligne porte `ring`, ses sommets en texte (« lat,lon;lat,lon;… », '' sans contour
//     ou pour un contour illisible, gardé tel quel) ; ringOf(row) → [[lat, lon]…] | null ; ringMiddle(ring) ; moveVertex, insertVertex,
//     removeVertex(rows, i, k[, pos]) ; toContour(rows, i) et toRound(rows, i) ; movePlace déplace un contour d'un bloc ; VERTICES :
//     3 à 100 sommets ; withPlaces écrit les sommets retouchés sous la clé du fichier (points, polygon ou vertices) ;
//     la route du départ (Tracé, push 3b) : routeOf(doc) → ses identifiants (route_order, soixante au plus) ; withRoute(doc, ids) → un
//     NOUVEAU document (rien de changé, rien de réécrit ; une entrée du fichier garde sa forme) ; routeToken(ligne) → « ORIGIN »,
//     « DESTINATION » ou l'identifiant du lieu ; ROUTE_MAX ; deadRefs(doc) → les références qui ne
//     désignent aucun lieu ; mapsNoCentre(doc), drawersNoPoint(doc), drawersNoKey(doc) → les cartes au centre vidé, les parties au délai
//     sans point, les parties restées sans clé (leur zone ou le point de leur arrivée retirés).
//   THEATRES : les théâtres de la V2 (apps/cpco/mission_skeleton.js).
//   cadreOf(doc) → { family, subtype, series, id, title, theatre, dep, arr, airline, aircraft } (textes) ; placeText(p) : « XTST · Base
//     Test » ; fieldText(texte) : ce que le champ Départ ou Arrivée montre (le code seul d'un terrain, sinon le texte) et fieldCode(texte)
//     son code ('' sans code) — SOG-0465. airline : la compagnie (airline au premier niveau, la forme de move.js ; '' = personnelle) ; aircraft : aircraft[0].type.
//   COMMERCIAL, liaison(family) : la famille commerciale (thème COMMERCIAL, sigle CAT, lettre E) — une liaison : le Cadre se réduit au
//     départ, à l'arrivée, à la compagnie, à la charge (le sous-type) et à l'aéronef ; liaisonTitle(dep, arr) → « LFPO → LFRS » ;
//     Équipes, Risques, Chronologie et le théâtre ne comptent pas dans « À compléter » (décision du 13 nov., SOG-0287).
//   withCadre(doc, cadre) → un NOUVEAU document : mission.{ id, type, subtype, series, number, theatre }, title, origin, destination ;
//     un terrain dont le code OACI ne change pas garde sa position, sinon elle tombe (à placer dans Lieux).
//   blank() → le document d'une mission neuve (schéma de la V2, helo-xp-mission 2.0), vide.
//   duplicate(doc) → une copie : l'opération et l'historique retirés, le reste gardé (l'identifiant se change ensuite par withCadre).
//   numbering(rows, family, letter) → { id, series, nextSeries } : l'identifiant suivant de la famille (« T-086 »), sa série en cours.
//   pathFor(letter, family, id) → 'missions/<lettre>_<FAMILLE>/<ID>/mission<ID>.yaml' ; '' si l'un n'a pas sa forme.
//   blocking(cadre, { rows, letter, own }) → [clé] : ce qui empêche d'enregistrer (famille, format de l'identifiant, lettre de la
//     famille, identifiant déjà pris par une autre ligne) ; le reste n'est jamais bloquant.
//   todo(doc) → [{ step, key, vars? }] : « À compléter » (jamais bloquant) ; vars : ce que le mot nomme (SOG-0439).
//   L'atelier voilé (SOG-0459, « l'existence même des tiroirs est cachée par défaut, auteur compris ») : veiledAt(mode, fullView) →
//     vrai quand une mission s'ouvre voilée — « edit » et « dup » sauf `fullView === true` strictement, jamais « new » ; un mode
//     inconnu : voilé (échec fermé) ; veilHidden(doc) → ['zone:0', …] : les lignes des Lieux (sorte et place dans le fichier) que le
//     pilote ne voit pas au départ (pilotRows(doc, lignes, 0)) — calculé à l'ouverture, il désigne les MÊMES entrées après un
//     enregistrement (un lieu neuf va au bout de sa sorte, un lieu du fichier ne se retire pas sans dévoiler) ; veilRows(rows,
//     hidden) → les lignes, une ligne cachée devenue null (les rangs ne bougent pas : un filtre d'affichage, jamais un retrait) ;
//     veilTodo(doc, shown) → « À compléter » sans rien du caché (ni tiroir, ni lieu caché ; « à placer » des seules lignes montrées).
//   stepState(doc, step) → 'ok' | 'todo'.
//   regAdd(regDoc, entry) → { doc } | { error: 'taken' } ; regEdit(regDoc, idx, regId, cadre, path, now) → { doc } | { error: 'stale' }.
//   yamlText(doc, Y, now) : le texte du fichier (en-tête daté, puis le document).
//   shapeOf(doc) → '' | 'alias' | 'size' : refusé à l'ouverture quand il ne se réécrit pas sans risque ; same(a, b) : rien n'a changé.
//   Règle des with… (audit 182, Sécurisation) : seul ce que le pilote a changé est écrit ; « Enregistrer » sans rien toucher n'écrit rien.
import * as MS from '../../frame/lib/mission.js';
import {
  isCode
} from '../../frame/lib/ad_field.js'; // SOG-0465 : le motif d'un code de terrain est celui du champ commun (fonction pure, sans instance ni écran)

export const STEPS = ['cadre', 'teams', 'places', 'story', 'risks', 'timeline'];
/** La famille commerciale : une liaison (SOG-0287, ajout du 13 nov.). */
export const COMMERCIAL = 'COMMERCIAL';
export const liaison = family => String(family || '').toUpperCase() === COMMERCIAL;
export const OPEN = ['cadre', 'teams', 'places', 'story', 'risks', 'timeline'];
/** Les événements d'une chronologie, au plus. */
export const EVENTS_MAX = 60;
/** Les risques d'une mission, au plus (la borne du lecteur). */
export const RISKS_MAX = 40;
/** Le résumé conseillé (la synthèse le montre entier jusque-là, SOG-0291) ; une description, au plus. */
export const SUMMARY_MAX = 600,
  TEXT_MAX = 20000;
/** Les lieux d'une sorte, au plus (la borne du lecteur pour les points). */
export const PLACES_MAX = 60;
/** Les équipes d'une mission, au plus (la borne du lecteur, frame/lib/mission.js). */
export const TEAMS_MAX = 40;
export const NODES_MAX = MS.NODES_MAX;
export const THEATRES = ['métropole', 'Corse', 'Antilles', 'Guyane', 'Réunion', 'Mayotte', 'Nouvelle-Calédonie', 'Polynésie'];
/** L'identifiant d'une mission (la forme de add.js) et une famille (mission.type). */
const MISSION_ID = /^[A-Z]-\d{3}[A-Z]?$/,
  FAMILY = /^[A-Z][A-Z0-9_]{1,23}$/;

/** Un texte nettoyé (sans caractère de format invisible : `visible` du lecteur, blancs repliés) et borné. */
const cut = (v, n) => MS.visible(v).replace(/\s+/g, ' ').trim().slice(0, n);
/** Un objet du document, ou {}. */
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
/** Une liste du document comme le lecteur la lit (frame/lib/mission.js list) : un tableau, un objet seul = une entrée, sinon rien
 *  (audit 186 : un « rendezvous: { … } » seul était perdu à la première retouche des Lieux). */
const arrOf = v => Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : [];

/** Le test d'un code de terrain complet (quatre signes ou code de liste d'une hélistation) : celui du champ de terrain de la suite
 *  (`isCode`, fonction pure de frame/lib/ad_field.js, SOG-0465) — le motif n'est écrit nulle part ailleurs ; aucune instance du champ,
 *  aucun écran. Réexporté pour l'atelier (ED.isCode). */
export {
  isCode
};

/** Un mot de quatre ou cinq signes lu comme un code de terrain : le code en majuscules s'il en est un (avec au moins une lettre), '' sinon. */
function wordCode(w) {
  const u = String(w || '').toUpperCase();
  return /[A-Z]/.test(u) && isCode(u) ? u : '';
}

/** Ce que la base aéronautique a répondu sur un code (SOG-0469) : code → vrai (elle connaît ce terrain) ou faux ; un fait sur la base,
 *  pas un état d'écran — l'atelier et le bloc en lecture le notent (noteAerodrome) quand leur demande revient. Borné. */
const KNOWN = new Map();

/** Note que la base connaît (ou ne connaît pas) le terrain de ce code ; sans effet pour autre chose qu'un code (isCode). */
export function noteAerodrome(code, known) {
  const k = String(code || '').toUpperCase();
  if (isCode(k) && (KNOWN.has(k) || KNOWN.size < 400)) KNOWN.set(k, known === true);
}

/** Le code écrit EN TÊTE d'un texte de terrain, avec le séparateur (·, -, –, —, :) et le nom qui suit, ou seul : « xtst · base test » →
 *  { icao: 'XTST', rest: 'base test', exact } ; `exact` : le code est écrit en majuscules. null sans code (isCode) en tête. */
function headCode(text) {
  const a = /^([A-Za-z0-9]{4,5})(?:\s*[·\-–—:]\s*(.*))?$/.exec(cut(text, 160)),
    icao = a ? wordCode(a[1]) : '';
  return icao ? {
    icao,
    rest: cut(a[2], 120),
    exact: a[1] === icao
  } : null;
}

/** Le code écrit ENTRE PARENTHÈSES à la fin d'un texte (« Base Test (XTST) ») : { icao, exact, cut } (`cut` : le texte sans la
 *  parenthèse), null sans code (isCode). */
function tailCode(text) {
  const t = cut(text, 1000),
    m = /\(([A-Za-z0-9]{4,5})\)\s*$/.exec(t),
    icao = m ? wordCode(m[1]) : '';
  return icao ? {
    icao,
    exact: m[1] === icao,
    cut: cut(t.replace(/\s*\([A-Za-z0-9]{4,5}\)\s*$/, ''), 120)
  } : null;
}

/** Les codes que ce texte POURRAIT porter, en majuscules, quelle que soit la casse : en tête (« xtst · Base Test »), entre parenthèses
 *  à la fin (« Base Test (xtst) ») — pour les demander à la base aéronautique (SOG-0469) ; rien n'est tenu pour un terrain ici. */
export function codeCands(text) {
  const t = cut(text, 1000),
    out = [headCode(t)?.icao, tailCode(t)?.icao].filter(Boolean);
  return [...new Set(out)];
}

/** Le premier code possible d'un nom de lieu (voir codeCands), '' sinon. */
export function adCodeOf(name) {
  return codeCands(name)[0] || '';
}

/** Un code lu dans un texte : { icao, name } ou null. Un code écrit en MAJUSCULES (« XTST · Base », « Base (XTST) ») est lu comme il l'a
 *  toujours été ; un code en minuscules ou mêlées (« xtst », « Piste (nord) », « Metz ») ne l'est que si la base aéronautique CONNAÎT ce
 *  terrain (noteAerodrome) : quatre lettres ne font pas un code (SOG-0469). */
function codeIn(raw) {
  const t = cut(raw, 1000),
    h = headCode(t),
    m = tailCode(t);
  if (h && (h.exact || KNOWN.get(h.icao) === true)) return {
    icao: h.icao,
    name: h.rest
  };
  if (m && (m.exact || KNOWN.get(m.icao) === true)) return {
    icao: m.icao,
    name: m.cut
  };
  return null;
}

/** Le texte d'un terrain : « XTST · Base Test » (le code OACI d'abord : le champ `icao` — un code déclaré par l'auteur, en majuscules
 *  quelle que soit sa casse —, sinon un code lu dans le nom, voir codeIn), le nom seul sans code ; un texte dont le code n'est pas connu
 *  reste tel qu'écrit. Ce qui est écrit dans le fichier n'est pas touché : seul l'affichage est lu ainsi. */
export function placeText(p) {
  const o = obj(p),
    raw = String(o.name || ''),
    given = wordCode(String(o.icao || '').trim()),
    c = codeIn(raw),
    icao = given || c?.icao || '',
    t = cut(raw, 1000),
    h = headCode(t),
    m = tailCode(t);
  let name = cut(raw, 120);
  if (icao && h && h.icao === icao) name = h.rest;
  else if (icao && m && m.icao === icao) name = m.cut;
  return [icao, name].filter(Boolean).join(' · ');
}
/** Le code de terrain qu'un texte de Départ ou d'Arrivée porte (voir codeIn : écrit en majuscules, ou connu de la base), '' sinon
 *  (SOG-0465). */
export function fieldCode(text) {
  return codeIn(cut(text, 160))?.icao || '';
}

/** Ce que le champ Départ ou Arrivée du Cadre montre d'un texte de terrain (SOG-0465, le champ de terrain de la suite) : le CODE seul
 *  quand le texte en porte un (fieldCode) — le nom se lit sous le champ —, le texte tel qu'écrit sinon (« metz », « Hôpital Nord »). */
export function fieldText(text) {
  return fieldCode(text) || cut(text, 160);
}

/** Un terrain saisi (« XTST · Base Test », « Base Test (XTST) », « XTST », et en minuscules ceux que la base connaît) → { icao, name } ;
 *  le nom écrit « Base Test (XTST) » ; un texte sans code connu reste tel que saisi. */
function placeIn(text) {
  const t = cut(text, 160),
    a = codeIn(t),
    icao = a ? a.icao : '',
    bare = a ? a.name : cut(t, 120);
  return {
    icao,
    name: icao ? bare ? `${bare} (${icao})` : icao : bare
  };
}

/** Le cadre d'une mission (voir l'en-tête). */
export function cadreOf(doc) {
  const m = obj(obj(doc).mission);
  return {
    family: cut(m.type, 24).toUpperCase(),
    subtype: cut(m.subtype, 40),
    series: m.series === undefined || m.series === null ? '' : cut(m.series, 5),
    id: cut(m.id, 40),
    title: cut(obj(doc).title, 200),
    theatre: cut(m.theatre, 40),
    dep: placeText(obj(doc).origin),
    arr: placeText(obj(doc).destination),
    airline: MS.airlineCode(m.airline ?? obj(doc).airline),
    aircraft: cut(obj(arrOf(obj(doc).aircraft)[0]).type, 60)
  };
}

/** Le titre proposé d'une liaison : « LFPO → LFRS » (les codes OACI, sinon les noms saisis) ; '' sans les deux bouts. */
export function liaisonTitle(dep, arr) {
  const a = placeIn(dep),
    b = placeIn(arr),
    x = a.icao || a.name,
    y = b.icao || b.name;
  return x && y ? `${x} → ${y}` : '';
}

/** Un terrain retouché : le nom et le code saisis ; la position gardée si le code ne change pas, sinon retirée. */
function placeWith(prev, text) {
  const p = obj(prev),
    {
      icao,
      name
    } = placeIn(text);
  if (!name) return null;
  const same = icao && (p.icao === icao || MS.icaoOf(p.name) === icao),
    out = {
      ...(same ? p : {}),
      name
    };
  if (icao) out.icao = icao;
  else delete out.icao;
  if (!same) {
    delete out.lat;
    delete out.lon;
  }
  return out;
}

/** Le document avec le cadre retouché (voir l'en-tête). */
export function withCadre(doc, cadre) {
  const out = structuredClone(obj(doc)),
    c = cadre || {},
    prev = cadreOf(doc),
    // audit 182 : seul ce que le pilote a changé est écrit — un champ inchangé garde la valeur du fichier telle quelle (jamais recoupée)
    changed = k => String(c[k] ?? '') !== String(prev[k] ?? '');
  if (!['id', 'family', 'subtype', 'series', 'theatre', 'title', 'dep', 'arr', 'airline', 'aircraft'].some(changed)) return out;
  const m = out.mission = {
    ...obj(out.mission)
  };
  if (changed('id')) {
    m.id = cut(c.id, 40).toUpperCase();
    const num = /^[A-Z]-(\d{3})/.exec(m.id);
    if (num) m.number = +num[1];
  }
  if (changed('family')) m.type = cut(c.family, 24).toUpperCase();
  if (changed('subtype')) {
    if (cut(c.subtype, 40)) m.subtype = cut(c.subtype, 40);
    else delete m.subtype;
  }
  if (changed('series')) {
    const t = String(c.series ?? '').trim();
    if (/^\d{1,5}$/.test(t)) m.series = +t;
    else delete m.series;
  }
  if (changed('theatre')) {
    if (cut(c.theatre, 40)) m.theatre = cut(c.theatre, 40);
    else delete m.theatre;
  }
  if (changed('title')) out.title = cut(c.title, 200);
  // la compagnie : au premier niveau (la forme de move.js « Changer de compagnie ») ; vide ou « perso » = personnelle
  if (changed('airline')) {
    const code = MS.airlineCode(c.airline);
    delete m.airline;
    if (code && code !== MS.PERSONAL) out.airline = code;
    else delete out.airline;
  }
  // l'aéronef : le type du premier aéronef (les autres et ses autres clés gardés)
  if (changed('aircraft')) {
    const ac = [...arrOf(out.aircraft)],
      first = {
        ...obj(ac[0])
      },
      t = cut(c.aircraft, 60).toUpperCase();
    if (t) first.type = t;
    else delete first.type;
    ac[0] = first;
    // seul le premier est retouché ; les autres entrées, même null (audit 190), restent telles quelles ; un premier vidé qui était absent
    // ou null le redevient
    if (!Object.keys(first).length && (ac.length <= 1 || !ac[0])) ac[0] = ac.length > 1 ? null : undefined;
    out.aircraft = ac.filter((x, i) => !(i === 0 && x === undefined));
    if (!out.aircraft.length) delete out.aircraft;
  }
  for (const [k, f] of [
      ['origin', 'dep'],
      ['destination', 'arr']
    ])
    if (changed(f)) {
      const pl = placeWith(out[k], c[f]);
      if (pl) out[k] = pl;
      else delete out[k];
    }
  return out;
}

/** Les équipes d'une mission (voir l'en-tête). */
export function teamsOf(doc) {
  return arrOf(obj(doc).teams).slice(0, TEAMS_MAX).map((t, i) => ({
    i,
    name: cut(obj(t).name, 80),
    service: cut(obj(t).service, 120),
    type: cut(obj(t).type, 60),
    role: cut(obj(t).role, 200)
  }));
}

/** Le document avec ses équipes retouchées (voir l'en-tête). */
export function withTeams(doc, rows) {
  const out = structuredClone(obj(doc)),
    prev = teamsOf(doc),
    list = Array.isArray(rows) ? rows : [];
  // audit 182 : rien de changé, rien de réécrit ; sinon une équipe inchangée reste l'objet du fichier, une équipe retouchée ne prend
  // que ses champs changés, les équipes au-delà de TEAMS_MAX (non montrées) restent telles quelles à la fin
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  const before = arrOf(out.teams),
    F = ['name', 'service', 'type', 'role'],
    N = {
      name: 80,
      service: 120,
      type: 60,
      role: 200
    },
    put = (t, f, v) => {
      const x = cut(v, N[f]);
      if (x) t[f] = f === 'type' ? x.toUpperCase() : x;
      else delete t[f];
    },
    teams = list.slice(0, TEAMS_MAX).map(r => {
      const was = Number.isInteger(r?.i) && r.i >= 0 ? prev.find(x => x.i === r.i) : null;
      if (was) {
        const diff = F.filter(f => String(r[f] ?? '') !== String(was[f] ?? ''));
        if (!diff.length) return before[r.i];
        const t = {
          ...obj(before[r.i])
        };
        for (const f of diff) put(t, f, r[f]);
        return Object.keys(t).length ? t : null;
      }
      const t = {};
      for (const f of F) put(t, f, r?.[f]);
      return Object.keys(t).length ? t : null;
    }).filter(t => t !== null),
    all = [...teams, ...before.slice(TEAMS_MAX)];
  if (all.length) out.teams = all;
  else delete out.teams;
  return out;
}

/** Une coordonnée saisie (« 44.6 », « 44,6 ») : un nombre dans [-max, max], null vide ou hors bornes. */
const coord = (v, max) => {
  const t = String(v ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 1e6) / 1e6 : null;
};
/** Un nombre positif saisi, ou null. */
const positive = (v, max) => {
  const n = coord(v, max);
  return n !== null && n >= 0 ? n : null;
};
/** Un nombre lu du fichier, en texte pour un champ ('' sinon ; un texte blanc n'est pas zéro). */
const numText = v => v === null || v === undefined || String(v).trim() === '' || !Number.isFinite(+v) ? '' : String(+v);
/** Une valeur écrite (ni absente, ni vide). */
const written = v => v !== undefined && v !== null && v !== '';
/** Oui ou non écrit dans le fichier, comme le lecteur le lit (false, 0, « non », « no », « false » : non). */
const yes = (v, dflt) => !written(v) ? dflt : !(v === false || v === 0 || /^(false|no|non|0)$/i.test(String(v).trim()));

/** Les bornes du nombre de sommets d'un contour (celles du lecteur : frame/lib/mission.js DRAWER_BOUNDS.vertices). */
export const VERTICES = Object.freeze([3, 100]);
/** Un sommet lu : [lat, lon] dans ses bornes (un nombre, ou un texte de nombre), sinon null — jamais ramené dans ses bornes. */
const vertexOf = v => {
  const o = v && typeof v === 'object' ? (Array.isArray(v) ? {
      lat: v[0],
      lon: v[1]
    } : v) : null,
    num = (x, max) => (typeof x === 'number' || (typeof x === 'string' && x.trim() !== '')) && Number.isFinite(+x) && Math.abs(+x) <=
    max ?
    Math.round(+x * 1e6) / 1e6 : null,
    lat = o ? num(o.lat, 90) : null,
    lon = o ? num(o.lon, 180) : null;
  return lat === null || lon === null ? null : [lat, lon];
};
/** Les sommets d'un contour en texte de ligne — « 44.5,1.5;44.5,1.7;44.4,1.7 » — quand ils sont 3 à 100 et tous situés ; '' sinon (le
 *  contour n'est alors pas retouché : le fichier le garde tel quel). */
const ringText = list => {
  if (!Array.isArray(list) || list.length < VERTICES[0] || list.length > VERTICES[1]) return '';
  const pts = list.map(vertexOf);
  return pts.every(Boolean) ? pts.map(p => p.join(',')).join(';') : '';
};
/** Les sommets d'une ligne de zone : [[lat, lon]…] (3 à 100, bornés), ou null sans contour retouchable. */
export function ringOf(row) {
  const t = row && typeof row === 'object' && typeof row.ring === 'string' ? row.ring : '';
  if (!t || t.length > 4000) return null;
  const pts = t.split(';').map(x => {
    const [a, b, more] = x.split(',');
    return more === undefined ? vertexOf([a, b]) : null;
  });
  return pts.length >= VERTICES[0] && pts.length <= VERTICES[1] && pts.every(Boolean) ? pts : null;
}

/** Les lieux d'une mission (voir l'en-tête). */
export function placesOf(doc) {
  const d = obj(doc),
    arr = v => arrOf(v).slice(0, PLACES_MAX),
    out = [];
  for (const [kind, key] of [
      ['dep', 'origin'],
      ['arr', 'destination']
    ])
    if (placeText(d[key])) out.push({
      kind,
      i: 0,
      id: '',
      name: placeText(d[key]),
      role: '',
      lat: numText(obj(d[key]).lat),
      lon: numText(obj(d[key]).lon)
    });
  if (d.target && typeof d.target === 'object') out.push({
    kind: 'target',
    i: 0,
    id: cut(d.target.id, 40),
    name: cut(d.target.name, 120),
    role: cut(d.target.role, 200),
    lat: numText(d.target.lat),
    lon: numText(d.target.lon)
  });
  arr(d.zones).forEach((z, i) => {
    const o = obj(z),
      c = obj(o.centre ?? o.center),
      poly = [o.points, o.polygon, o.vertices].find(a => Array.isArray(a) && a.length > 2);
    out.push({
      kind: 'zone',
      i,
      id: cut(o.id, 40),
      name: cut(o.name, 120),
      role: cut(o.role, 200),
      zkind: cut(o.kind, 40),
      lat: numText(c.lat ?? o.lat),
      lon: numText(c.lon ?? o.lon),
      radius: numText(o.radius_km ?? o.radiusKm),
      tot: numText(o.time_on_task_min),
      poly: poly ? poly.length : 0,
      ring: ringText(
        poly) // les sommets d'un contour lisible (SOG-0444, lot P2) ; '' : pas de contour, ou un contour gardé tel quel
    });
  });
  arr(d.turning_points).forEach((p, i) => out.push({
    kind: 'pt',
    i,
    id: cut(obj(p).id, 40),
    name: cut(obj(p).name, 120),
    role: cut(obj(p).role, 200),
    lat: numText(obj(p).lat),
    lon: numText(obj(p).lon)
  }));
  arr(d.rendezvous).forEach((p, i) => out.push({
    kind: 'rdv',
    i,
    id: cut(obj(p).id, 40),
    name: cut(obj(p).name, 120),
    role: cut(obj(p).role, 200),
    lat: numText(obj(p).lat),
    lon: numText(obj(p).lon),
    participants: (Array.isArray(obj(p).participants) ? obj(p).participants : typeof obj(p).participants === 'string' ? [obj(p)
        .participants
      ] : [])
      .slice(0, 20).map(x => cut(x, 60)).filter(Boolean)
      .join(', ')
  }));
  // les objets à trouver (SOG-0445) : des lieux que seul l'auteur voit ; une cible mobile est gardée telle quelle
  arr(d.objects).forEach((p, i) => {
    const o = obj(p);
    out.push({
      kind: 'object',
      i,
      id: cut(o.id, 40),
      name: cut(o.name, 120),
      role: '',
      okind: cut(o.kind, 24).toLowerCase(),
      lat: numText(o.lat),
      lon: numText(o.lon),
      range: numText(o.detection_range_nm),
      height: numText(o.detection_height_ft),
      alt: numText(o.altitude_ft),
      confirm: yes(o.require_confirmation, true),
      moving: written(o.route_order) || written(o.speed_kt) || written(o.motion)
    });
  });
  return out;
}

/** Le document avec ses lieux retouchés (voir l'en-tête). */
export function withPlaces(doc, rows) {
  const out = structuredClone(obj(doc)),
    prev = placesOf(doc),
    list = Array.isArray(rows) ? rows : [];
  // audit 182 : rien de changé, rien de réécrit ; sinon un lieu inchangé reste l'objet du fichier, un lieu retouché ne prend que ses
  // champs changés, les lieux au-delà de PLACES_MAX (non montrés) restent tels quels à la fin
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  const wasOf = r => Number.isInteger(r?.i) && r.i >= 0 ? prev.find(x => x.kind === r.kind && x.i === r.i) : null,
    diffOf = (r, was, F) => was ? F.filter(f => String(r[f] ?? '') !== String(was[f] ?? '')) : F,
    text = (o, k, v, n) => {
      const x = cut(v, n);
      if (x) o[k] = x;
      else delete o[k];
    },
    common = (o, r, diff) => {
      if (diff.includes('id')) text(o, 'id', r.id, 40);
      if (diff.includes('name')) text(o, 'name', r.name, 120);
      if (diff.includes('role')) text(o, 'role', r.role, 200);
    },
    // une position : là où l'objet la portait ; null quand elle est vide ou hors bornes (« à placer »)
    at = (o, r, diff) => {
      if (diff.includes('lat')) o.lat = coord(r.lat, 90);
      if (diff.includes('lon')) o.lon = coord(r.lon, 180);
    };
  for (const [kind, key] of [
      ['dep', 'origin'],
      ['arr', 'destination']
    ]) {
    const r = list.find(x => x.kind === kind),
      was = prev.find(x => x.kind === kind);
    if (r && was && out[key] && typeof out[key] === 'object') {
      const diff = diffOf(r, was, ['lat', 'lon']);
      if (diff.length) at(out[key] = {
        ...out[key]
      }, r, diff);
    }
  }
  const t = list.find(x => x.kind === 'target'),
    tw = prev.find(x => x.kind === 'target');
  if (!t) {
    if (tw) delete out.target;
  } else {
    const diff = diffOf(t, tw, ['id', 'name', 'role', 'lat', 'lon']);
    if (diff.length) {
      const o = {
        ...(tw ? obj(out.target) : {})
      };
      common(o, t, diff);
      at(o, t, diff);
      out.target = o;
    }
  }
  const rebuild = (kind, key, F, apply) => {
    // une sorte dont aucune ligne n'a changé garde sa clé telle que le fichier l'écrit (un objet seul reste un objet seul, audit 186)
    const mine = list.filter(x => x.kind === kind),
      was = prev.filter(x => x.kind === kind);
    if (JSON.stringify(mine) === JSON.stringify(was)) return;
    const before = arrOf(out[key]),
      items = list.filter(x => x.kind === kind).slice(0, PLACES_MAX).map(r => {
        const was = wasOf(r),
          diff = diffOf(r, was, F);
        if (was && !diff.length) return before[r.i];
        const o = {
          ...(was ? obj(before[r.i]) : {})
        };
        common(o, r, diff);
        apply(o, r, diff, was ? obj(before[r.i]) : {});
        return o;
      }),
      all = [...items, ...before.slice(PLACES_MAX)];
    if (all.length) out[key] = all;
    else if (key in out) delete out[key];
  };
  rebuild('zone', 'zones', ['id', 'name', 'role', 'zkind', 'lat', 'lon', 'radius', 'tot', 'ring'], (z, r, diff, b) => {
    if (diff.includes('zkind')) text(z, 'kind', r.zkind, 40);
    if (diff.includes('ring')) {
      // les sommets : sous la clé que le fichier emploie (points, sinon polygon, sinon vertices ; « points » pour une zone neuve) ; un
      // sommet resté à sa place garde l'objet du fichier (ses autres clés) ; sans sommet (la zone redevient ronde), la clé est retirée
      const keys = ['points', 'polygon', 'vertices'],
        key = keys.find(k => Array.isArray(b[k])) || 'points',
        old = arrOf(b[key]),
        ring = ringOf(r);
      for (const k of keys) delete z[k];
      if (ring) z[key] = ring.map(([lat, lon]) => old.find(v => {
        const q = vertexOf(v);
        return q && q[0] === lat && q[1] === lon && !Array.isArray(v);
      }) || {
        lat,
        lon
      });
    }
    if (diff.includes('lat') || diff.includes('lon')) {
      const lat = coord(r.lat, 90),
        lon = coord(r.lon, 180);
      // le centre : là où le fichier le portait (centre: { lat, lon }, ou lat / lon à plat) ; un polygone garde ses points
      if (b.lat !== undefined && !b.centre) Object.assign(z, {
        lat,
        lon
      });
      else if (b.center && !b.centre) z.center = { // le centre écrit « center » (le lecteur l'accepte) : retouché là
        ...obj(b.center),
        lat,
        lon
      };
      else z.centre = {
        ...obj(b.centre),
        lat,
        lon
      };
    }
    if (diff.includes('radius')) {
      const v = positive(r.radius, 500);
      if (v !== null) z.radius_km = v;
      else delete z.radius_km;
    }
    if (diff.includes('tot')) {
      const v = positive(r.tot, 9999);
      if (v !== null) z.time_on_task_min = v;
      else delete z.time_on_task_min;
    }
  });
  rebuild('pt', 'turning_points', ['id', 'name', 'role', 'lat', 'lon'], (o, r, diff) => at(o, r, diff));
  rebuild('rdv', 'rendezvous', ['id', 'name', 'role', 'lat', 'lon', 'participants'], (o, r, diff) => {
    at(o, r, diff);
    if (diff.includes('participants')) o.participants = String(r.participants ?? '').split(',').map(x => cut(x, 60)).filter(Boolean)
      .slice(0,
        20);
  });
  // un objet à trouver : sa sorte (une de celles du lecteur), sa position, sa portée (au-dessus de 0), sa hauteur de détection, son
  // altitude, « trouvé sur la parole du pilote » ; un nombre hors bornes n'est pas écrit ; ses autres clés (la route d'une cible, sa
  // vitesse, son indicatif) sont gardées
  rebuild('object', 'objects', ['id', 'name', 'okind', 'lat', 'lon', 'range', 'height', 'alt', 'confirm'], (o, r, diff) => {
    if (diff.includes('okind')) {
      const k = cut(r.okind, 24).toLowerCase();
      if (MS.OBJECT_KINDS.includes(k)) o.kind = k;
      else delete o.kind;
    }
    at(o, r, diff);
    const num = (f, key, v) => {
      if (!diff.includes(f)) return;
      if (v !== null) o[key] = v;
      else delete o[key];
    };
    num('range', 'detection_range_nm', positive(r.range, 100) || null);
    num('height', 'detection_height_ft', positive(r.height, 60000));
    num('alt', 'altitude_ft', (v => v !== null && v >= -1500 ? v : null)(coord(r.alt, 60000)));
    if (diff.includes('confirm')) o.require_confirmation = r.confirm === true;
  });
  return out;
}

/** Un texte de plusieurs lignes, borné, ses fins de ligne ramenées à « \n ». */
const para = (v, n) => MS.visible(v).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, n);

/** Le récit d'une mission (voir l'en-tête). */
export function storyOf(doc) {
  const d = obj(doc),
    o = d.objectives,
    pl = obj(d.payload);
  return {
    summary: para(d.summary, SUMMARY_MAX * 4),
    description: para(d.detailed_description, TEXT_MAX),
    primary: Array.isArray(o) ? '' : para(obj(o).primary, 2000),
    secondary: (Array.isArray(o) ? o : Array.isArray(obj(o).secondary) ? obj(o).secondary : typeof obj(o).secondary === 'string' ? [obj(o)
      .secondary
    ] : []).slice(0, 20).map(x => cut(x, 300)).filter(
      Boolean).join('\n'),
    payload: para(pl.description, 2000),
    mass: numText(pl.mass_kg),
    pax: numText(pl.passengers)
  };
}

/** Le document avec son récit retouché (voir l'en-tête). */
export function withStory(doc, st) {
  const out = structuredClone(obj(doc)),
    t = st || {},
    prev = storyOf(doc),
    // audit 182 : seul ce que le pilote a changé est écrit ; le reste du fichier, objectifs et charge compris, tel quel
    diff = ['summary', 'description', 'primary', 'secondary', 'payload', 'mass', 'pax'].filter(k => String(t[k] ?? '') !== String(prev[k] ??
      ''));
  if (!diff.length) return out;
  if (diff.includes('summary')) out.summary = para(t.summary, SUMMARY_MAX * 4);
  if (diff.includes('description')) out.detailed_description = para(t.description, TEXT_MAX);
  if (diff.includes('primary') || diff.includes('secondary')) {
    const o = Array.isArray(out.objectives) ? {
      secondary: out.objectives
    } : {
      ...obj(out.objectives)
    };
    if (diff.includes('primary')) {
      o.primary = para(t.primary, 2000);
      if (!o.primary) delete o.primary;
    }
    if (diff.includes('secondary')) {
      o.secondary = String(t.secondary ?? '').split('\n').map(x => cut(x, 300)).filter(Boolean).slice(0, 20);
      if (!o.secondary.length) delete o.secondary;
    }
    if (Object.keys(o).length) out.objectives = o;
    else delete out.objectives;
  }
  if (diff.some(k => ['payload', 'mass', 'pax'].includes(k))) {
    const pl = {
      ...obj(out.payload)
    };
    if (diff.includes('payload')) {
      pl.description = para(t.payload, 2000);
      if (!pl.description) delete pl.description;
    }
    if (diff.includes('mass')) {
      const v = positive(t.mass, 999999);
      if (v !== null) pl.mass_kg = v;
      else delete pl.mass_kg;
    }
    if (diff.includes('pax')) {
      const v = positive(t.pax, 9999);
      if (v !== null && Number.isInteger(v)) pl.passengers = v;
      else delete pl.passengers;
    }
    if (Object.keys(pl).length) out.payload = pl;
    else delete out.payload;
  }
  return out;
}

/** Les risques d'une mission (voir l'en-tête). */
export function risksOf(doc) {
  return arrOf(obj(doc).risks).slice(0, RISKS_MAX).map((r, i) => typeof r === 'string' ? {
    i,
    hazard: cut(r, 300),
    consequence: '',
    mitigation: ''
  } : {
    i,
    hazard: cut(obj(r).hazard ?? obj(r).title ?? obj(r).name, 300),
    consequence: cut(obj(r).consequence, 300),
    mitigation: cut(obj(r).mitigation, 300)
  });
}

/** Le document avec ses risques retouchés (voir l'en-tête). */
export function withRisks(doc, rows) {
  const out = structuredClone(obj(doc)),
    prev = risksOf(doc),
    list = Array.isArray(rows) ? rows : [];
  // audit 182 : rien de changé, rien de réécrit ; un risque inchangé reste l'objet (ou le texte) du fichier, un risque retouché ne prend
  // que ses champs changés ; ceux au-delà de RISKS_MAX restent tels quels à la fin
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  const before = arrOf(out.risks),
    F = ['hazard', 'consequence', 'mitigation'],
    put = (o, f, v) => {
      const x = cut(v, 300);
      if (x) o[f] = x;
      else delete o[f];
    },
    // le danger comme risksOf le lit (hazard, sinon title, sinon name) : un risque dont le danger est sous title reste (audit 187)
    danger = o => cut(o.hazard ?? o.title ?? o.name, 300),
    dropped = new Set(),
    kept = new Set(list.filter(r => Number.isInteger(r?.i) && r.i >= 0).map(r => r.i)),
    risks = list.slice(0, RISKS_MAX).map(r => {
      const was = Number.isInteger(r?.i) && r.i >= 0 ? prev.find(x => x.i === r.i) : null;
      if (was) {
        const diff = F.filter(f => String(r[f] ?? '') !== String(was[f] ?? ''));
        if (!diff.length) return before[r.i];
        const o = typeof before[r.i] === 'string' ? {
          hazard: before[r.i]
        } : {
          ...obj(before[r.i])
        };
        for (const f of diff) put(o, f, r[f]);
        // le danger effacé à dessein : le risque part, et ses traductions avec lui
        if (diff.includes('hazard') && !cut(r.hazard, 300)) {
          dropped.add(r.i);
          return null;
        }
        if (danger(o)) return o;
        dropped.add(r.i);
        return null;
      }
      const o = {};
      for (const f of F) put(o, f, r?.[f]);
      return o.hazard ? o : null;
    }).filter(o => o !== null),
    all = [...risks, ...before.slice(RISKS_MAX)];
  if (all.length) out.risks = all;
  else delete out.risks;
  // les traductions suivent « même ordre que risks » (le prompt de la V2) : un risque retiré l'est aussi de chaque langue
  const gone = prev.filter(p => !kept.has(p.i) || dropped.has(p.i)).map(p => p.i).sort((a, b) => b - a);
  if (gone.length && out.i18n && typeof out.i18n === 'object')
    for (const [lang, t] of Object.entries(out.i18n))
      if (t && typeof t === 'object' && Array.isArray(t.risks)) {
        const tr = [...t.risks];
        for (const i of gone) tr.splice(i, 1);
        out.i18n[lang] = {
          ...t,
          risks: tr
        };
      }
  return out;
}

/** Une valeur qui peut porter des événements : absente, une liste ou un objet (audit 194 : une valeur nue — un texte — n'est jamais
 *  remplacée). */
const holder = v => v === undefined || v === null || typeof v === 'object';
/** Où vivent les événements d'une mission (audit 190) : `timeline` en liste (l'ancienne forme), `timeline.events`, `chronology` en liste
 *  ou `chronology.events` ; la première qui en porte, sinon timeline.events (la forme de shared/mission_exercise.js) ; audit 194 : une
 *  `timeline` nue laisse la place à `chronology`, et quand les deux sont nues, nulle part (null : rien n'est écrit). → { key, sub } | null */
function eventsHome(d) {
  for (const key of ['timeline', 'chronology']) {
    const v = d[key];
    if (Array.isArray(v) && v.length) return {
      key,
      sub: false
    };
    if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.events) && v.events.length) return {
      key,
      sub: true
    };
    if (v && typeof v === 'object' && !Array.isArray(v) && v.events && typeof v.events === 'object') return {
      key,
      sub: true
    };
  }
  if (holder(d.timeline)) return {
    key: 'timeline',
    sub: !Array.isArray(d.timeline)
  };
  return holder(d.chronology) ? {
    key: 'chronology',
    sub: !Array.isArray(d.chronology)
  } : null;
}
/** Vrai quand la mission a une place pour ses événements (audit 194 : faux quand timeline et chronology sont deux valeurs nues). */
export const eventsStorable = doc => !!eventsHome(obj(doc));
/** Les événements tels qu'ils sont dans le document (voir eventsHome). */
const eventsIn = d => {
  const h = eventsHome(d);
  if (!h) return [];
  const v = d[h.key];
  return arrOf(h.sub ? obj(v).events : v);
};
/** Le texte d'un événement : `text`, sinon `description`, sinon `label` (audit 190) ; la clé d'où il vient. */
const textKey = e => ['text', 'description', 'label'].find(k => typeof obj(e)[k] === 'string' && obj(e)[k].trim()) || 'text';

/** La chronologie d'une mission (voir l'en-tête) : où qu'elle vive (eventsHome), le texte sous text / description / label. */
export function eventsOf(doc) {
  return eventsIn(obj(doc)).slice(0, EVENTS_MAX).map((e, i) => ({
    i,
    at: cut(obj(e).at, 20),
    place: cut(obj(e).place, 40).toUpperCase(),
    text: cut(obj(e)[textKey(e)], 500)
  }));
}

/** Le document avec sa chronologie retouchée (voir l'en-tête ; la règle de l'audit 182). */
export function withEvents(doc, rows) {
  const out = structuredClone(obj(doc)),
    prev = eventsOf(doc),
    list = Array.isArray(rows) ? rows : [];
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  // les événements restent là où le fichier les porte (une liste reste une liste, chronology reste chronology) : jamais remplacés ;
  // audit 194 : sans place (deux valeurs nues), rien n'est écrit
  const home = eventsHome(out);
  if (!home) return out;
  const
    before = eventsIn(out),
    F = ['at', 'place', 'text'],
    N = {
      at: 20,
      place: 40,
      text: 500
    },
    put = (o, f, v) => {
      const x = f === 'place' ? cut(v, N[f]).toUpperCase() : cut(v, N[f]);
      if (x) o[f] = x;
      else delete o[f];
    },
    events = list.slice(0, EVENTS_MAX).map(r => {
      const was = Number.isInteger(r?.i) && r.i >= 0 ? prev.find(x => x.i === r.i) : null;
      if (was) {
        const diff = F.filter(f => String(r[f] ?? '') !== String(was[f] ?? ''));
        if (!diff.length) return before[r.i];
        const o = {
            ...obj(before[r.i])
          },
          tk = textKey(before[r.i]);
        for (const f of diff)
          if (f === 'text') { // le texte retouché là où il était (text, description ou label)
            const x = cut(r.text, 500);
            if (x) o[tk] = x;
            else delete o[tk];
          } else put(o, f, r[f]);
        return o[tk] || o.text || o.place ? o : null;
      }
      const o = {};
      for (const f of F) put(o, f, r?.[f]);
      return o.text || o.place ? o : null;
    }).filter(o => o !== null),
    all = [...events, ...before.slice(EVENTS_MAX)];
  storeEvents(out, home, all);
  return out;
}

/** Range les événements `all` là où le document les porte (`home` : eventsHome) : une liste reste une liste, `events` reste sous sa
 *  clé avec les autres clés de celle-ci ; sans événement, la liste part (et sa clé, si elle ne portait rien d'autre). */
function storeEvents(out, home, all) {
  const cur = out[home.key];
  if (!home.sub) {
    if (all.length) out[home.key] = all;
    else delete out[home.key];
  } else if (all.length) out[home.key] = {
    ...obj(cur),
    events: all
  };
  else if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
    const rest = {
      ...cur
    };
    delete rest.events;
    if (Object.keys(rest).length) out[home.key] = rest;
    else delete out[home.key];
  }
}

/** Les cartes d'une mission (voir l'en-tête) : { id, type, description, ref, unplaced } ; unplaced quand le lieu de son centre n'a pas
 *  de position. */
export function mapsOf(doc) {
  const places = new Map(placesOf(doc).filter(p => p.id).map(p => [p.id.toUpperCase(), p]));
  return arrOf(obj(doc).maps).slice(0, 40).map(m => {
    // une carte écrite comme un nom de fichier seul (le lecteur l'accepte, audit 190) : montrée par ce nom
    const o = typeof m === 'string' ? {
        id: m
      } : obj(m),
      ref = cut(o.centre_ref ?? o.center_ref, 40).toUpperCase(),
      p = places.get(ref);
    return {
      id: cut(o.id ?? o.filename, 60),
      type: cut(o.type, 40),
      description: cut(o.description, 300),
      ref,
      unplaced: !!p && !p.poly && (p.lat === '' || p.lon === '')
    };
  });
}

/** Les cartes attendues d'après les lieux, absentes du fichier (la règle de la V2, apps/cpco/mission_guide.js proposedMaps) : générale,
 *  cible et son détail, un détail par rendez-vous, une par zone. Des entrées seulement : les images se font au studio de la V2. */
export function proposedMaps(doc) {
  const d = obj(doc),
    // l'identifiant dans les noms de fichier seulement s'il a sa forme (audit 190 : jamais un texte libre dans un nom de fichier)
    id = MISSION_ID.test(cut(obj(d.mission).id, 40)) ? cut(obj(d.mission).id, 40) : '',
    have = new Set(arrOf(d.maps).map(m => cut(typeof m === 'string' ? m : obj(m).id, 60))),
    out = [{
      id: 'general',
      filename: `general${id}.png`,
      type: 'general',
      description: 'Vue d’ensemble : départ, points tournants, cible, rendez-vous, zone, arrivée.',
      include: {
        origin: true,
        destination: true,
        turning_points: true,
        target: true,
        rendezvous: true,
        zones: true
      }
    }];
  if (d.target && typeof d.target === 'object') out.push({
    id: 'cible',
    filename: `cible${id}.png`,
    type: 'target',
    centre_ref: cut(d.target.id, 40) || 'TARGET',
    range_km: 50,
    description: 'Abords de la cible (50 km).'
  }, {
    id: 'detail_cible',
    filename: `detail_cible${id}.png`,
    type: 'detail',
    centre_ref: cut(d.target.id, 40) || 'TARGET',
    width_km: 8,
    height_km: 5,
    description: 'Détail de la cible (8 × 5 km).'
  });
  arrOf(d.rendezvous).forEach((r, k) => out.push({
    id: `detail_rdv_${k + 1}`,
    filename: `detail_rdv${id}-${k + 1}.png`,
    type: 'detail_rdv',
    centre_ref: cut(obj(r).id, 40),
    width_km: 8,
    height_km: 5,
    description: `Détail du rendez-vous ${cut(obj(r).id, 40)} (8 × 5 km).`
  }));
  arrOf(d.zones).forEach((z, k) => out.push({
    id: `zone_${k + 1}`,
    filename: `zone${id}${k ? `-${k + 1}` : ''}.png`,
    type: 'zone',
    centre_ref: cut(obj(z).id, 40) || `ZONE-${k + 1}`,
    range_km: 20,
    description: `Zone de travail ${cut(obj(z).id, 40) || `ZONE-${k + 1}`}.`
  }));
  return out.filter(m => !have.has(m.id));
}

/** Le fond et la couche de la carte de la mission lus du fichier (SOG-0456 ; `mission_map`, borné par le lecteur). */
export const mapLookOf = doc => MS.mapLook(obj(doc).mission_map);

/** Le document avec le choix de l'auteur pour la carte de la mission : `mission_map: { base, airspaces }` — deux valeurs fermées et
 *  un booléen, rien d'autre n'y est écrit. Un choix identique à ce que le fichier dit ne retouche rien (audit 182). */
export function withMapLook(doc, look) {
  const want = MS.mapLook(look),
    have = mapLookOf(doc);
  if (want.base === have.base && want.airspaces === have.airspaces) return doc;
  const out = structuredClone(obj(doc));
  out.mission_map = {
    base: want.base,
    airspaces: want.airspaces
  };
  return out;
}

/** Le document avec les cartes proposées ajoutées à la fin de `maps` (un objet seul devient une liste ; jamais une carte retirée). */
export function withMaps(doc, add) {
  const out = structuredClone(obj(doc)),
    extra = (Array.isArray(add) ? add : []).filter(m => m && typeof m === 'object');
  if (extra.length) out.maps = [...arrOf(out.maps), ...extra];
  return out;
}

// ---------------------------------------------------------------- les références aux lieux (SOG-0439)
// Un lieu est cité par son identifiant dans : route_order, phases[].trigger_point, phases[].route_order, maps[].centre_ref (ou
// center_ref), le lieu d'un événement de la chronologie, vertical_profile.route, alert.phases[].route. La V2 les compare en capitales et
// coupe un mot à « / » (shared/mission_estimate.js) : même règle ici. Les événements d'une mission d'organisation (Z) citent les lieux
// d'AUTRES fichiers : ils ne sont pas suivis.

/** Les mots d'une route qui ne sont pas des lieux de la liste (le départ, l'arrivée, le dégagement). */
const REF_WORDS = new Set(['ORIGIN', 'DESTINATION', 'DEPART', 'DEPARTURE', 'ARRIVAL', 'ARRIVEE', 'ALTERNATE']);
/** Un identifiant comme il se compare (sans casse, sans blancs autour). */
const refKey = v => String(v ?? '').trim().toUpperCase();
/** Retiré d'une liste par mapRefs (un événement qui n'a plus ni lieu ni texte). */
const DROP = Symbol('drop');

/** L'identifiant par lequel chaque ligne de lieux est citée, dans l'ordre des lignes : { key (comparé), text (écrit) } ; la cible sans
 *  identifiant est « TARGET », une zone sans identifiant « ZONE-n » (son rang parmi les zones : la règle de la V2 et de la Carte) ; le
 *  départ et l'arrivée ne sont jamais cités par un identifiant (ORIGIN, DESTINATION). */
function citedIds(rows) {
  let z = 0;
  return (Array.isArray(rows) ? rows : []).map(r => {
    const n = r?.kind === 'zone' ? ++z : 0,
      text = r?.kind === 'dep' || r?.kind === 'arr' ? '' : cut(r?.id, 40) || (r?.kind === 'target' ? 'TARGET' : r?.kind === 'zone' ?
        `ZONE-${n}` : '');
    return {
      key: refKey(text),
      text
    };
  });
}

/** Le document dont chaque référence à un lieu est passée par `fn(mot, where, name)` → le mot gardé, un autre mot, ou null (la référence
 *  est retirée). `where` : route | drawer | drawerKey | drawerStop | drawerRoute | map | event | profile | alert ; `name` : le rang du
 *  tiroir (« 1 »), la carte, l'alerte.
 *  La clé d'un tiroir (SOG-0445 ; docs/technique/FORMAT_MISSION.md § 3) : `trigger_zone` écrit par identifiant, le `point` de
 *  `trigger_condition` (et de chaque étape d'une suite), ses `required_points` (drawerStop). Une zone ou un objet écrits DANS la partie
 *  ne citent rien.
 *  Un NOUVEAU document, dont seuls les champs changés sont de nouveaux objets (audit 182) ; rien ne change, le document rendu est `doc`.
 *  Les objets (SOG-0445, depuis qu'ils sont des lignes des Lieux) : `trigger_object` et l'`object` d'une condition (drawerKey),
 *  `trigger_actor` — la cible qui franchit la zone à la place du pilote (drawerActor) —, la route d'une cible mobile, `route_order` d'un
 *  objet (objectRoute, `name` : l'identifiant de la cible).
 *  Retirer une référence : un mot sort d'une liste de route ; le point de déclenchement d'une partie part, son délai RESTE (une partie
 *  qui porte un délai sans point : « À compléter » le dit, dans cette séance et les suivantes) ; la zone de sa clé part, son heure de
 *  repli et « zone montrée » RESTENT ; le point de sa condition part, la condition RESTE (drawersNoKey les dit de même) ; une carte garde son entrée, son centre
 *  écrit vide (dit de même) ; un événement garde son texte (sans texte, il part). */
function mapRefs(doc, fn) {
  const d = obj(doc),
    out = {
      ...d
    };
  let touched = false;
  const put = (k, v) => {
      if (v === d[k]) return;
      touched = true;
      if (v === undefined) delete out[k];
      else out[k] = v;
    },
    scalar = v => typeof v === 'string' || typeof v === 'number',
    // un mot : l'identifiant, puis ce qui suit « / » (gardé tel quel) ; les blancs autour gardés quand rien ne change
    word = (tok, where, name) => {
      const s = String(tok),
        core = s.trim(),
        i = core.indexOf('/'),
        head = i < 0 ? core : core.slice(0, i).trim(),
        r = head ? fn(head, where, name) : head;
      return r === null ? null : r === head ? tok : r + (i < 0 ? '' : core.slice(i));
    },
    // une liste de route : des identifiants, ou des objets { id }
    route = (arr, where, name) => {
      if (!Array.isArray(arr)) return arr;
      let ch = false;
      const next = [];
      for (const x of arr) {
        const o = x && typeof x === 'object' && !Array.isArray(x),
          tok = o ? x.id : x;
        if (!scalar(tok)) {
          next.push(x);
          continue;
        }
        const r = word(tok, where, name);
        if (r === null) ch = true;
        else if (r !== tok) {
          ch = true;
          next.push(o ? {
            ...x,
            id: r
          } : r);
        } else next.push(x);
      }
      return ch ? next : arr;
    },
    // une liste d'objets, ou un objet seul (la forme tolérée du lecteur), retouchée objet par objet
    each = (v, edit) => {
      if (Array.isArray(v)) {
        let ch = false;
        const next = v.map((x, n) => {
          if (!x || typeof x !== 'object' || Array.isArray(x)) return x;
          const y = edit(x, n);
          if (y !== x) ch = true;
          return y;
        }).filter(x => x !== DROP);
        return ch ? next : v;
      }
      if (v && typeof v === 'object') {
        const y = edit(v, 0);
        return y === DROP ? undefined : y;
      }
      return v;
    };
  put('route_order', route(d.route_order, 'route', ''));
  put('phases', each(d.phases, (p, n) => {
    // un tiroir se dit par son RANG (« le tiroir 1 » : décision du 17 nov., les lettres désignent les équipages d'une opération)
    const name = String(n + 1);
    let q = p;
    if (scalar(p.trigger_point)) {
      const r = word(p.trigger_point, 'drawer', name);
      if (r === null) {
        q = {
          ...q
        };
        delete q.trigger_point;
      } else if (r !== p.trigger_point) q = {
        ...q,
        trigger_point: r
      };
    }
    // sa clé écrite par identifiant (SOG-0445) : la zone de passage ; une zone écrite dans la partie (un objet) ne cite rien
    if (scalar(p.trigger_zone)) {
      const r = word(p.trigger_zone, 'drawerKey', name);
      if (r === null) {
        q = {
          ...q
        };
        delete q.trigger_zone;
      } else if (r !== p.trigger_zone) q = {
        ...q,
        trigger_zone: r
      };
    }
    // l'objet à trouver de sa clé, et la cible qui franchit sa zone à la place du pilote : des objets de la mission, par identifiant
    for (const [k, where] of [
        ['trigger_object', 'drawerKey'],
        ['trigger_actor', 'drawerActor']
      ])
      if (scalar(p[k])) {
        const r = word(p[k], where, name);
        if (r === null) {
          q = {
            ...q
          };
          delete q[k];
        } else if (r !== p[k]) q = {
          ...q,
          [k]: r
        };
      }
    // le point de sa condition (une arrivée, une tenue, un posé, un survol ; chaque étape d'une suite) et ses arrêts demandés
    const tc = p.trigger_condition;
    if (tc && typeof tc === 'object' && !Array.isArray(tc)) {
      const rule = c => {
          let k = c;
          if (scalar(c.point)) {
            const r = word(c.point, 'drawerKey', name);
            if (r === null) {
              k = {
                ...k
              };
              delete k.point;
            } else if (r !== c.point) k = {
              ...k,
              point: r
            };
          }
          // … ou l'objet qu'elle suit
          if (scalar(c.object)) {
            const r = word(c.object, 'drawerKey', name);
            if (r === null) {
              k = {
                ...k
              };
              delete k.object;
            } else if (r !== c.object) k = {
              ...k,
              object: r
            };
          }
          const rq = route(c.required_points, 'drawerStop', name);
          if (rq !== c.required_points) k = {
            ...k,
            required_points: rq
          };
          return k;
        },
        top = rule(tc),
        steps = Array.isArray(tc.steps) ? each(tc.steps, rule) : tc.steps,
        next = steps === tc.steps ? top : {
          ...top,
          steps
        };
      if (next !== tc) q = {
        ...q,
        trigger_condition: next
      };
    }
    const ro = route(p.route_order, 'drawerRoute', name);
    if (ro !== p.route_order) q = {
      ...q,
      route_order: ro
    };
    return q;
  }));
  // la route d'une cible mobile : des lieux de la mission
  put('objects', each(d.objects, o => {
    const ro = route(o.route_order, 'objectRoute', cut(o.id, 40));
    return ro === o.route_order ? o : {
      ...o,
      route_order: ro
    };
  }));
  put('maps', each(d.maps, m => {
    const k = scalar(m.centre_ref) ? 'centre_ref' : scalar(m.center_ref) ? 'center_ref' : '';
    if (!k) return m;
    const r = word(m[k], 'map', cut(m.id ?? m.filename, 60));
    if (r === m[k]) return m;
    return {
      ...m,
      [k]: r === null ? '' : r
    };
  }));
  const home = eventsHome(d),
    held = home ? home.sub ? obj(d[home.key]).events : d[home.key] : null;
  if (held && typeof held === 'object') {
    const next = each(held, e => {
      if (!scalar(e.place)) return e;
      const r = word(e.place, 'event', '');
      if (r === e.place) return e;
      const q = {
        ...e
      };
      if (r === null) delete q.place;
      else q.place = r;
      return r === null && !cut(q[textKey(q)], 500) ? DROP : q;
    });
    if (next !== held) {
      touched = true;
      storeEvents(out, home, arrOf(next));
    }
  }
  const vp = d.vertical_profile;
  if (vp && typeof vp === 'object' && !Array.isArray(vp)) {
    let r = vp.route;
    if (Array.isArray(r)) r = route(r, 'profile', '');
    else if (typeof r === 'string' && r.trim()) {
      const parts = r.split(/[,\n]+/),
        next = parts.map(t => t.trim() ? word(t, 'profile', '') : t);
      if (next.some((t, i) => t !== parts[i])) r = next.filter(t => t !== null).map(t => t.trim()).filter(Boolean).join(r.includes(',') ?
        ', ' : '\n');
    }
    if (r !== vp.route) put('vertical_profile', {
      ...vp,
      route: r
    });
  }
  const al = d.alert;
  if (al && typeof al === 'object' && !Array.isArray(al)) {
    const ph = each(al.phases, p => {
      const ro = route(p.route, 'alert', cut(p.id, 8));
      return ro === p.route ? p : {
        ...p,
        route: ro
      };
    });
    if (ph !== al.phases) put('alert', {
      ...al,
      phases: ph
    });
  }
  return touched ? out : d;
}

/** Les références aux lieux d'une mission : [{ id (le mot du fichier), where, name }] (voir mapRefs). */
export function refsOf(doc) {
  const out = [];
  mapRefs(doc, (id, where, name) => {
    out.push({
      id,
      where,
      name
    });
    return id;
  });
  return out;
}

/** Ce que les lieux sont devenus depuis le fichier : fate (l'identifiant d'avant → { key, text } d'aujourd'hui, ou null : lieu retiré),
 *  now (les identifiants d'aujourd'hui), deadBefore (les références déjà mortes dans le fichier). Une ligne gardée se reconnaît à sa
 *  sorte et à sa place dans le fichier (`i`), jamais à son nom. */
function placeFate(base, rows) {
  const was = placesOf(base),
    wasIds = citedIds(was),
    nowIds = citedIds(rows),
    at = new Map(was.map((p, n) => [`${p.kind}:${p.i}`, wasIds[n].key])),
    seen = new Set(),
    fate = new Map();
  rows.forEach((r, n) => {
    const k = `${r?.kind}:${r?.i}`;
    if (!Number.isInteger(r?.i) || r.i < 0 || !at.has(k)) return;
    seen.add(k);
    // deux lieux du fichier sous le même identifiant : le premier est celui que les références désignent
    if (at.get(k) && !fate.has(at.get(k))) fate.set(at.get(k), nowIds[n].key ? nowIds[n] : null);
  });
  for (const [k, id] of at)
    if (id && !seen.has(k) && !fate.has(id)) fate.set(id, null);
  const known = new Set(wasIds.map(x => x.key).filter(Boolean));
  return {
    fate,
    now: new Set(nowIds.map(x => x.key).filter(Boolean)),
    deadBefore: new Set(refsOf(base).map(r => refKey(r.id)).filter(k => !known.has(k) && !REF_WORDS.has(k)))
  };
}

/** Le document dont les références suivent les lieux (SOG-0439) — la DERNIÈRE retouche de l'éditeur, après toutes les étapes : les
 *  lignes gardées à l'écran (chronologie, cartes proposées) portent encore les identifiants du fichier. `base` : le fichier lu ; `rows` :
 *  les lignes des Lieux (rien sans elles : l'étape jamais ouverte ne change rien). Un lieu renommé est renommé partout ; la référence à
 *  un lieu retiré est retirée (mapRefs) ; une référence qui ne désigne plus rien et que le fichier ne portait pas (un lieu ajouté puis
 *  retiré) aussi ; une référence DÉJÀ morte dans le fichier est gardée telle quelle (audit 182 ; deadRefs la dit). Un mot du profil
 *  (FL100) ou le centre d'une carte (la Carte accepte un nom) qui n'est pas un lieu d'avant est gardé. Limite : un identifiant libéré
 *  puis repris par un autre lieu dans la même séance — les références du fichier suivent LEUR lieu ; une ligne choisie à l'écran
 *  après l'échange peut désigner l'autre. */
export function withRefs(doc, base, rows) {
  if (!Array.isArray(rows)) return obj(doc);
  const {
    fate,
    now,
    deadBefore
  } = placeFate(base, rows);
  return mapRefs(doc, (id, where) => {
    const k = refKey(id);
    if (REF_WORDS.has(k)) return id;
    if (fate.has(k)) {
      const to = fate.get(k);
      return to === null ? null : to.key === k ? id : to.text;
    }
    return now.has(k) || deadBefore.has(k) || where === 'profile' || where === 'map' ? id : null;
  });
}

/** L'identifiant d'aujourd'hui d'une référence du fichier (pour une liste à l'écran) : celui du lieu renommé, '' pour un lieu retiré,
 *  le mot tel quel sinon. */
export function refNow(id, base, rows) {
  if (!Array.isArray(rows)) return String(id ?? '');
  const to = placeFate(base, rows).fate.get(refKey(id));
  return to === undefined ? String(id ?? '') : to === null ? '' : to.text;
}

/** Qui cite le lieu de la ligne `i` dans le document : [{ where, name, n }] (n : le nombre de fois), [] pour un lieu jamais cité. */
export function citedBy(doc, rows, i) {
  const k = citedIds(rows)[i]?.key,
    out = [];
  if (!k) return out;
  for (const r of refsOf(doc)) {
    if (refKey(r.id) !== k) continue;
    const had = out.find(x => x.where === r.where && x.name === r.name);
    if (had) had.n += 1;
    else out.push({
      where: r.where,
      name: r.name,
      n: 1
    });
  }
  return out;
}

/** Le temps pendant lequel « Retirer quand même » reste inerte après le premier appui (un double appui ne retire pas sans lecture). */
export const REMOVE_ARM_MS = 1000;

/** « Retirer » un lieu (SOG-0439) : un lieu que rien ne cite part tout de suite ; un lieu encore cité demande un second appui — le
 *  premier rend les lignes telles quelles, `ask` (la ligne qui attend) et `cited` (qui le cite, à dire) ; le second (`asked` est cette
 *  ligne) le retire, et withRefs retirera ses citations — sauf dans la seconde qui suit le premier (`sinceMs` : le temps écoulé depuis
 *  lui) : rien ne se passe (`wait`). → { rows, ask (-1 : rien n'attend), cited, wait? }. */
export function removePlace(rows, i, doc, asked = -1, sinceMs = Infinity) {
  const list = Array.isArray(rows) ? rows : [],
    cited = Number.isInteger(i) && list[i] ? citedBy(doc, list, i) : [];
  if (!Number.isInteger(i) || !list[i]) return {
    rows: list,
    ask: -1,
    cited
  };
  if (cited.length && asked === i && !(sinceMs >= REMOVE_ARM_MS)) return {
    rows: list,
    ask: i,
    cited,
    wait: true
  };
  return cited.length && asked !== i ? {
    rows: list,
    ask: i,
    cited
  } : {
    rows: list.filter((_, n) => n !== i),
    ask: -1,
    cited
  };
}

/** Un identifiant libre pour un lieu neuf de la sorte `kind` (zone, pt, rdv, object, target) : « ZONE-n », « PTn », « RDV-n », « OBJ-n », « TARGET » —
 *  n : le plus GRAND numéro de la sorte déjà porté, plus un (SOG-0459) — par les lignes de la séance et par les lieux du fichier lu
 *  (`base`, cachés compris : renommé ou retiré dans la séance, un lieu du fichier est encore désigné sous ce nom jusqu'à
 *  l'enregistrement). Un trou n'est jamais rebouché, donc un trou ne prouve rien : dans l'atelier voilé, « ZONE-2 » proposé ne
 *  trahit pas une ZONE-1 cachée. Au-delà de 9 999 : '' (le lieu se nomme à la main). */
export function nextPlaceId(rows, kind, base = null) {
  if (kind === 'target') return 'TARGET';
  const prefix = kind === 'zone' ? 'ZONE-' : kind === 'rdv' ? 'RDV-' : kind === 'object' ? 'OBJ-' : 'PT',
    form = new RegExp(`^${prefix}(\\d{1,4})$`),
    top = [...citedIds(rows), ...citedIds(placesOf(base))].reduce((m, x) => {
      const hit = form.exec(x.key);
      return hit ? Math.max(m, +hit[1]) : m;
    }, 0);
  return top < 9999 ? `${prefix}${top + 1}` : '';
}

/** Le nombre de lieux qu'une route porte au plus (la borne des suites de route des tiroirs). */
export const ROUTE_MAX = 60;
/** L'identifiant d'une entrée de route du fichier (un texte, ou { id }), borné ; '' sinon. */
const routeId = x => cut(x && typeof x === 'object' && !Array.isArray(x) ? x.id : typeof x === 'string' || typeof x === 'number' ? x : '',
  40);

/** La route du fichier coupée en deux : `ids`, ses soixante premiers identifiants (une entrée sans identifiant est sautée) — la part
 *  que l'atelier montre et retouche —, et `tail`, les entrées du fichier au-delà, gardées telles quelles. */
function routeParts(doc) {
  const raw = arrOf(obj(doc).route_order),
    ids = [];
  let n = 0;
  for (; n < raw.length && ids.length < ROUTE_MAX; n++) {
    const id = routeId(raw[n]);
    if (id) ids.push(id);
  }
  return {
    ids,
    tail: raw.slice(n)
  };
}

/** La route du départ (`route_order`) en liste d'identifiants — « ORIGIN », « PT1 », « TARGET », « DESTINATION » —, soixante au plus ;
 *  une entrée sans identifiant est sautée. */
export function routeOf(doc) {
  return routeParts(doc).ids;
}

/** Le document avec cette route du départ (un NOUVEAU document). Rien de changé — les mêmes identifiants dans le même ordre — : rien
 *  n'est réécrit (audit 182). Sinon `route_order` est la liste : une entrée dont l'identifiant était dans le fichier garde l'entrée du
 *  fichier (un texte, ou son objet avec ses autres clés), une neuve est un texte ; **les entrées du fichier au-delà de la soixantième
 *  restent telles quelles à la fin** (Sécurisation, 18 nov. 2026 : retoucher une longue route n'en perd aucun lieu) ; une liste vide,
 *  sans rien au-delà, retire la clé. Les identifiants sont des textes bornés (quarante signes), soixante au plus ; rien d'autre n'est
 *  lu de `ids`. */
export function withRoute(doc, ids) {
  const out = structuredClone(obj(doc)),
    {
      ids: was,
      tail
    } = routeParts(out),
    list = (Array.isArray(ids) ? ids : []).map(x => cut(typeof x === 'string' ? x : '', 40)).filter(Boolean).slice(0, ROUTE_MAX);
  if (JSON.stringify(list) === JSON.stringify(was)) return out;
  const old = arrOf(out.route_order).slice(0, arrOf(out.route_order).length - tail.length),
    all = [...list.map(id => old.find(x => routeId(x) === id) ?? id), ...tail];
  if (all.length) out.route_order = all;
  else delete out.route_order;
  return out;
}

/** Ce qu'une route écrit pour une ligne des Lieux : « ORIGIN » pour le départ, « DESTINATION » pour l'arrivée, sinon son identifiant
 *  ('' : un lieu sans identifiant n'entre pas dans une route). */
export function routeToken(row) {
  const r = row && typeof row === 'object' ? row : {};
  return r.kind === 'dep' ? 'ORIGIN' : r.kind === 'arr' ? 'DESTINATION' : cut(r.id, 40);
}

/** Une route où le lieu de rang n a avancé (step < 0) ou reculé (step > 0) d'UNE pastille : il échange sa place avec la pastille
 *  montrée la plus proche de ce côté (`shown(entrée)` : une entrée que l'écran ne montre pas — un lieu que le fichier cite et qui
 *  n'existe plus — reste où elle est). → { route, at } : la route neuve et le rang neuf du lieu ; la même route et le même rang s'il
 *  n'y a rien à faire (un rang hors de la route, le premier qu'on avance, le dernier qu'on recule). La route donnée n'est pas
 *  retouchée. */
export function routeMove(route, n, step, shown = () => true) {
  const list = Array.isArray(route) ? route : [],
    dir = step < 0 ? -1 : 1,
    same = {
      route: list,
      at: Number.isInteger(n) && n >= 0 && n < list.length ? n : -1
    };
  if (same.at < 0 || typeof shown !== 'function') return same;
  let to = n + dir;
  while (to >= 0 && to < list.length && !shown(list[to])) to += dir;
  if (to < 0 || to >= list.length) return same;
  const out = list.slice();
  [out[n], out[to]] = [out[to], out[n]];
  return {
    route: out,
    at: to
  };
}

/** Les rangs LIBRES de la route du départ (l'ergonome, 18 nov. 2026 : « le terrain de départ reste premier et le terrain d'arrivée
 *  dernier ») : « ORIGIN » en tête et « DESTINATION » en queue sont ANCRÉS — ils ne se déplacent pas, ne se retirent pas, et aucun
 *  lieu ne passe devant l'un ni derrière l'autre. → { lo, hi } : les rangs du premier et du dernier lieu libre (lo > hi : aucun). Une
 *  route qui ne commence pas par le départ, ou ne finit pas par l'arrivée (un ancien fichier), n'a pas cette ancre-là : elle n'est pas
 *  réécrite. La suite de route d'un tiroir, elle, est libre : elle ne passe pas par ici. */
export function routeFree(route) {
  const list = Array.isArray(route) ? route : [],
    lo = list[0] === 'ORIGIN' ? 1 : 0;
  return {
    lo,
    hi: list.length - 1 - (list.length > lo && list[list.length - 1] === 'DESTINATION' ? 1 : 0)
  };
}

/** routeMove dans la route du départ : seul un lieu libre bouge, et seulement parmi les lieux libres (routeFree). → { route, at } ;
 *  la même route et le même rang s'il n'y a rien à faire. */
export function routeMoveStart(route, n, step) {
  const list = Array.isArray(route) ? route : [],
    {
      lo,
      hi
    } = routeFree(list),
    same = {
      route: list,
      at: Number.isInteger(n) && n >= 0 && n < list.length ? n : -1
    };
  if (same.at < lo || same.at > hi) return same;
  const made = routeMove(list.slice(lo, hi + 1), n - lo, step);
  return made.at === n - lo ? same : {
    route: [...list.slice(0, lo), ...made.route, ...list.slice(hi + 1)],
    at: made.at + lo
  };
}

/** Un lieu ajouté à la route du départ : AVANT le terrain d'arrivée quand il la termine (il reste dernier), sinon à la fin. La route
 *  donnée n'est pas retouchée. */
export function routeAddStart(route, token) {
  const list = Array.isArray(route) ? route : [],
    at = routeFree(list).hi + 1;
  return [...list.slice(0, at), token, ...list.slice(at)];
}

/** Les sortes de lieu qu'un geste de la carte déplace : ni le départ ni l'arrivée (des terrains : leur position vient de la base). */
export const MOVABLE = Object.freeze(['target', 'zone', 'pt', 'rdv', 'object']);
/** Les bornes du rayon d'une zone ronde, en km (celles du lecteur : 500 au plus). */
export const RADIUS_KM = Object.freeze([0.05, 500]);
/** Une coordonnée venue d'un geste de la carte, en texte de ligne : cinq décimales (un mètre) ; '' hors bornes (jamais ramenée). */
const posText = (v, max) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max ? String(Math.round(v * 1e5) / 1e5) : '';

/** Une ligne neuve pour un lieu de la sorte `kind` (cible, zone, point tournant, rendez-vous, objet), posée à la place de sa sorte
 *  (l'ordre du fichier : cible, zones, points, rendez-vous, objets), avec un identifiant libre (nextPlaceId). `at` : sa position quand
 *  elle vient de la carte ({ lat, lon }, et pour une zone son rayon en km) — hors bornes, la ligne est créée « à placer ». → { rows, at
 *  (le rang de la ligne neuve) } ; null quand la sorte est pleine (PLACES_MAX, une seule cible) ou inconnue. */
export function newPlace(rows, kind, base = null, at = null) {
  const list = Array.isArray(rows) ? rows : [];
  if (!MOVABLE.includes(kind)) return null;
  const n = list.filter(r => r?.kind === kind).length + 1;
  if (n > PLACES_MAX || (kind === 'target' && n > 1)) return null;
  const lat = posText(at?.lat, 90),
    lon = posText(at?.lon, 180),
    km = typeof at?.radius === 'number' && at.radius >= RADIUS_KM[0] && at.radius <= RADIUS_KM[1] ? String(Math.round(at.radius * 100) /
      100) : '',
    row = {
      kind,
      i: -1,
      id: nextPlaceId(list, kind, base), // SOG-0439 : un identifiant libre
      name: '',
      role: '',
      lat: lat && lon ? lat : '',
      lon: lat && lon ? lon : '',
      ...(kind === 'zone' ? {
        zkind: '',
        radius: km,
        tot: '',
        poly: 0,
        ring: ''
      } : kind === 'rdv' ? {
        participants: ''
      } : kind === 'object' ? {
        okind: '',
        range: '',
        height: '',
        alt: '',
        confirm: true, // trouvé à portée ET sur la parole du pilote : le défaut du format
        moving: false
      } : {})
    },
    order = ['dep', 'arr', 'target', 'zone', 'pt', 'rdv', 'object'],
    where = list.findIndex(r => order.indexOf(r?.kind) > order.indexOf(kind));
  return where < 0 ? {
    rows: [...list, row],
    at: list.length
  } : {
    rows: [...list.slice(0, where), row, ...list.slice(where)],
    at: where
  };
}

/** Le milieu des sommets d'un contour ([lat, lon], six décimales) : là où la carte pose son étiquette et sa poignée. */
export function ringMiddle(ring) {
  return [Math.round(ring.reduce((t, p) => t + p[0], 0) / ring.length * 1e6) / 1e6, Math.round(ring.reduce((t, p) => t + p[1], 0) / ring
    .length * 1e6) / 1e6];
}
/** La ligne d'une zone avec ces sommets (cinq décimales), ou null s'ils ne font pas un contour (3 à 100, tous situés). */
function rowWithRing(r, ring) {
  const text = ringText(ring.map(([lat, lon]) => [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5]));
  return text ? {
    ...r,
    ring: text,
    poly: ring.length
  } : null;
}
/** Remplace la ligne i par `row` (de nouvelles lignes), ou rend les MÊMES lignes quand `row` est nul (le geste est refusé). */
const swapRow = (rows, i, row) => row ? rows.map((x, k) => k === i ? row : x) : rows;
/** La ligne i quand c'est une zone en contour retouchable, avec ses sommets ; sinon null. */
function contourAt(rows, i) {
  const r = Array.isArray(rows) && Number.isInteger(i) ? rows[i] : null,
    ring = r && typeof r === 'object' && r.kind === 'zone' ? ringOf(r) : null;
  return ring ? {
    r,
    ring
  } : null;
}
/** Une position de geste ({ lat, lon } en nombres) dans ses bornes : [lat, lon], sinon null. */
const gestureAt = pos => typeof pos?.lat === 'number' && typeof pos?.lon === 'number' ? vertexOf(pos) : null;

/** Un lieu déplacé par un geste de la carte : sa ligne prend la position (cinq décimales). Une zone en contour se déplace d'un bloc :
 *  `pos` est la place de son milieu, chaque sommet suit (et son centre, s'il en a un). Refusé — les MÊMES lignes sont rendues — pour le
 *  départ et l'arrivée, pour un contour gardé tel quel (illisible), pour un rang inconnu, une position hors bornes, ou un contour dont
 *  un sommet sortirait des bornes. */
export function movePlace(rows, i, pos) {
  const r = Array.isArray(rows) && Number.isInteger(i) ? rows[i] : null,
    lat = posText(pos?.lat, 90),
    lon = posText(pos?.lon, 180);
  if (!r || typeof r !== 'object' || !MOVABLE.includes(r.kind) || !lat || !lon) return rows;
  if (r.kind === 'zone' && r.poly) {
    const c = contourAt(rows, i);
    if (!c) return rows;
    const [mla, mlo] = ringMiddle(c.ring),
      row = rowWithRing(r, c.ring.map(p => [p[0] + pos.lat - mla, p[1] + pos.lon - mlo]));
    if (!row) return rows;
    const cla = posText(+r.lat + pos.lat - mla, 90),
      clo = posText(+r.lon + pos.lon - mlo, 180);
    return swapRow(rows, i, r.lat !== '' && r.lon !== '' && cla && clo ? {
      ...row,
      lat: cla,
      lon: clo
    } : row);
  }
  return rows.map((x, k) => k === i ? {
    ...x,
    lat,
    lon
  } : x);
}

/** Les sommets d'un contour, par un geste de la carte — de NOUVELLES lignes, ou les MÊMES quand le geste est refusé (pas un contour
 *  retouchable, un rang de sommet inconnu, une position hors bornes, moins de 3 ou plus de 100 sommets) : moveVertex(rows, i, k, pos)
 *  déplace le sommet k ; insertVertex(rows, i, k, pos) en pose un après le sommet k ; removeVertex(rows, i, k) retire le sommet k. */
export function moveVertex(rows, i, k, pos) {
  const c = contourAt(rows, i),
    at = gestureAt(pos);
  if (!c || !at || !Number.isInteger(k) || !c.ring[k]) return rows;
  return swapRow(rows, i, rowWithRing(c.r, c.ring.map((p, n) => n === k ? at : p)));
}
export function insertVertex(rows, i, k, pos) {
  const c = contourAt(rows, i),
    at = gestureAt(pos);
  if (!c || !at || !Number.isInteger(k) || !c.ring[k] || c.ring.length >= VERTICES[1]) return rows;
  return swapRow(rows, i, rowWithRing(c.r, [...c.ring.slice(0, k + 1), at, ...c.ring.slice(k + 1)]));
}
export function removeVertex(rows, i, k) {
  const c = contourAt(rows, i);
  if (!c || !Number.isInteger(k) || !c.ring[k] || c.ring.length <= VERTICES[0]) return rows;
  return swapRow(rows, i, rowWithRing(c.r, c.ring.filter((_, n) => n !== k)));
}

/** La forme d'une zone : toContour(rows, i) fait d'une zone ronde (un centre et un rayon dans leurs bornes) un contour de six sommets
 *  à son rayon — son centre et son rayon restent dans la ligne, pour le retour ; toRound(rows, i) rend ronde une zone en contour : ses
 *  sommets sont retirés, son centre est son milieu quand elle n'en avait pas, son rayon la distance moyenne de ses sommets quand elle
 *  n'en avait pas (dans RADIUS_KM). Refusé (les MÊMES lignes) pour ce qui n'est pas la forme attendue. */
export function toContour(rows, i) {
  const r = Array.isArray(rows) && Number.isInteger(i) ? rows[i] : null;
  if (!r || typeof r !== 'object' || r.kind !== 'zone' || r.poly) return rows;
  const c = vertexOf(r),
    km = positive(r.radius, RADIUS_KM[1]);
  if (!c || km === null || km < RADIUS_KM[0]) return rows;
  const d = km / 111.195,
    k = Math.max(0.01, Math.cos(c[0] * Math.PI / 180));
  return swapRow(rows, i, rowWithRing(r, [0, 1, 2, 3, 4, 5].map(n => [c[0] + d * Math.cos(n * Math.PI / 3), c[1] + d * Math.sin(n * Math
    .PI /
    3) / k])));
}
export function toRound(rows, i) {
  const c = contourAt(rows, i);
  if (!c) return rows;
  const mid = ringMiddle(c.ring),
    centre = vertexOf(c.r) || mid,
    k = Math.max(0.01, Math.cos(centre[0] * Math.PI / 180)),
    mean = c.ring.reduce((t, p) => t + Math.hypot(p[0] - centre[0], (p[1] - centre[1]) * k) * 111.195, 0) / c.ring.length,
    had = positive(c.r.radius, RADIUS_KM[1]),
    km = had !== null && had >= RADIUS_KM[0] ? had : Math.min(RADIUS_KM[1], Math.max(RADIUS_KM[0], Math.round(mean * 100) / 100));
  return swapRow(rows, i, {
    ...c.r,
    lat: String(Math.round(centre[0] * 1e5) / 1e5),
    lon: String(Math.round(centre[1] * 1e5) / 1e5),
    radius: String(km),
    ring: '',
    poly: 0
  });
}

/** Le rayon d'une zone ronde réglé par sa poignée, en km (deux décimales). Refusé — les MÊMES lignes — pour ce qui n'est pas une zone
 *  ronde, ou un rayon hors bornes (RADIUS_KM). */
export function placeRadius(rows, i, km) {
  const r = Array.isArray(rows) && Number.isInteger(i) ? rows[i] : null;
  if (!r || typeof r !== 'object' || r.kind !== 'zone' || r.poly || typeof km !== 'number' || !(km >= RADIUS_KM[0] && km <= RADIUS_KM[1]))
    return rows;
  return rows.map((x, k) => k === i ? {
    ...x,
    radius: String(Math.round(km * 100) / 100)
  } : x);
}

/** Les cartes dont le centre est écrit vide (la trace d'un lieu retiré, ou un fichier écrit ainsi) : leurs noms. */
export function mapsNoCentre(doc) {
  return arrOf(obj(doc).maps).filter(m => m && typeof m === 'object' && ['centre_ref', 'center_ref'].some(k => k in m && (m[k] === null ||
    String(m[k]).trim() === '')) && !['centre_ref', 'center_ref'].some(k => typeof m[k] === 'string' && m[k].trim())).map(m => cut(m.id ??
    m.filename, 60));
}

/** Les parties qui portent un délai sans point de déclenchement (la trace d'un lieu retiré) : leurs rangs (« 1 » : le premier tiroir).
 *  Une partie sans délai ni point s'ouvre au geste du pilote, à dessein : elle n'est pas dite. */
export function drawersNoPoint(doc) {
  const has = v => v !== undefined && v !== null && v !== '';
  return arrOf(obj(doc).phases).map((p, n) => p && typeof p === 'object' && !Array.isArray(p) && has(p.trigger_delay_min) && !has(p
    .trigger_point) && !has(p.trigger_zone) && !has(p.trigger_object) && !has(p.trigger_condition) ? String(n + 1) : '').filter(Boolean);
}

/** Les parties restées sans clé (SOG-0445) : leurs rangs. La trace d'une zone de passage retirée — plus aucune clé, et l'heure de
 *  repli ou « zone montrée » sont restées — ou du point d'une arrivée retiré (la condition est restée, sans son point). Une partie
 *  au délai sans point est dite par drawersNoPoint, jamais deux fois. */
export function drawersNoKey(doc) {
  const has = v => v !== undefined && v !== null && v !== '';
  return arrOf(obj(doc).phases).map((p, n) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return '';
    const c = p.trigger_condition,
      noPoint = c && typeof c === 'object' && !Array.isArray(c) && String(c.kind ?? '').trim().toLowerCase() === 'arrival' && !has(c
        .point),
      bare = !has(p.trigger_point) && !has(p.trigger_zone) && !has(p.trigger_object) && !has(c) && !has(p.trigger_delay_min) && (has(p
        .fallback_delay_min) || has(p.zone_shown));
    return noPoint || bare ? String(n + 1) : '';
  }).filter(Boolean);
}

/** Les références qui ne désignent aucun lieu de la mission (dites dans « À compléter ») : [{ id, where, name }], une fois par mot.
 *  Le profil vertical (niveaux) et le centre d'une carte (un nom accepté par la Carte) ne sont pas jugés. */
export function deadRefs(doc) {
  const known = new Set(citedIds(placesOf(doc)).map(x => x.key).filter(Boolean)),
    seen = new Set();
  return refsOf(doc).filter(r => {
    const k = refKey(r.id);
    if (r.where === 'profile' || r.where === 'map' || !k || known.has(k) || REF_WORDS.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Le document d'une mission neuve (voir l'en-tête). */
export function blank() {
  return {
    schema: 'helo-xp-mission',
    schema_version: '2.0',
    mission: {},
    title: '',
    summary: '',
    detailed_description: ''
  };
}

/** Une copie (voir l'en-tête). */
export function duplicate(doc) {
  const out = structuredClone(obj(doc));
  delete out.operation;
  if (out.meta && typeof out.meta === 'object') delete out.meta.history;
  return out;
}

/** La numérotation (voir l'en-tête) : le plus grand numéro des identifiants de la lettre, plus un ; la plus grande série de la famille. */
export function numbering(rows, family, letter) {
  const L = /^[A-Z]$/.test(letter || '') ? letter : '',
    list = (Array.isArray(rows) ? rows : []),
    nums = list.map(r => new RegExp(`^${L}-(\\d{3})`).exec(String(r.id || '')) || new RegExp(`^${L}-(\\d{3})`).exec(String(r
      .formerId || ''))).filter(m => L && m).map(m => +m[1]),
    ser = list.filter(r => r.family === family).map(r => +r.series).filter(n => Number.isInteger(n) && n > 0),
    top = ser.length ? Math.max(...ser) : 0;
  return {
    id: L ? `${L}-${String(Math.min(999, (nums.length ? Math.max(...nums) : 0) + 1)).padStart(3, '0')}` : '',
    series: top || 1,
    nextSeries: top + 1 || 2
  };
}

/** Le chemin du fichier (voir l'en-tête). */
export function pathFor(letter, family, id) {
  if (!/^[A-Z]$/.test(letter || '') || !FAMILY.test(family || '') || !MISSION_ID.test(id || '')) return '';
  const p = `missions/${letter}_${family}/${id}/mission${id}.yaml`;
  return MS.missionPath(p) ? p : '';
}

/** Ce qui bloque l'enregistrement (voir l'en-tête). `own` : les identifiants de la ligne éditée (le sien et son ancien). */
export function blocking(cadre, {
  rows = [],
  letter = '',
  own = []
} = {}) {
  const c = cadre || {},
    id = cut(c.id, 40).toUpperCase(),
    out = [];
  if (!FAMILY.test(cut(c.family, 24).toUpperCase())) out.push('family');
  // l'identifiant de la ligne éditée, inchangé, n'est jamais refusé (un fichier dont la famille diffère de sa lettre reste modifiable)
  if (own.includes(id)) return out;
  if (!MISSION_ID.test(id)) out.push('idForm');
  else if (letter && id[0] !== letter) out.push('idLetter');
  else if (rows.some(r => r.id === id || r.formerId === id)) out.push('idTaken');
  return out;
}

/** Les lignes des Lieux que le pilote peut voir une fois les `n` premiers tiroirs ouverts (SOG-0448) : seulement ce que le lecteur
 *  lui rend (MS.pilotView : UNE règle, celle de la fiche, du Détail et de la Carte) — le départ et l'arrivée toujours, la cible si
 *  elle est montrée, un objet seulement quand le tiroir dont il est la clé est ouvert, les autres lieux par leur identifiant. Une
 *  ligne non gardée devient null : les rangs des autres ne bougent pas. Une mission sans tiroir, ou que le lecteur ne lit pas : les
 *  lignes données, telles quelles. */
export function pilotRows(doc, rows, n) {
  let m = null;
  try {
    m = MS.readMission(doc);
  } catch {
    return rows;
  }
  const drawers = Array.isArray(m?.drawers) ? m.drawers : [],
    v = drawers.length ? MS.pilotView(m, drawers.slice(0, Number.isFinite(n) && n > 0 ? n : 0).map(d => d.id)) : null;
  if (!v || v === m || !Array.isArray(rows)) return rows;
  const up = x => String(x ?? '').trim().toUpperCase(),
    kept = new Set([...Object.keys(v.points), ...v.zones.map(z => z.id), ...v.rendezvous.map(z => z.id), ...v.turns.map(z => z.id)].map(
      up)),
    // la vue ne rend que les tiroirs ouverts (SOG-0459) : l'objet de la clé de chacun
    objects = new Set(v.drawers.map(d => up(d.key?.object?.id)).filter(Boolean));
  return rows.map(r => r.kind === 'dep' || r.kind === 'arr' ? r : r.kind === 'target' ? (v.target ? r : null) : r.kind === 'object' ? (
    objects.has(up(r.id)) ? r : null) : r.id && kept.has(up(r.id)) ? r : null);
}

/** Les lieux d'une mission À TIROIRS que rien ne cite (l'ergonome, 18 nov. 2026) : ceux que le pilote ne verrait pas même tous les
 *  tiroirs ouverts — ni la route, ni une carte, ni un tiroir ne les nomme (un objet : il n'est la clé d'aucun tiroir). La règle du
 *  lecteur les lui cache pour toujours : l'auteur doit le savoir. → [{ id, kind }] : l'identifiant et la sorte du lieu (zone, object,
 *  pt, rdv, target : « À compléter » accorde son mot à la sorte ; un lieu sans identifiant ne peut être cité par rien : il a son
 *  propre mot ailleurs). Une mission sans tiroir n'a pas de secret : aucun. */
export function uncited(doc) {
  const rows = placesOf(doc),
    kept = pilotRows(doc, rows, DRAWERS_ALL);
  return kept === rows ? [] : rows.filter((r, i) => kept[i] === null).map(r => ({
    id: cut(r.id, 40),
    kind: r.kind
  })).filter(u => u.id);
}
/** Plus de tiroirs qu'une mission n'en porte : « tous ouverts ». */
const DRAWERS_ALL = 64;

/** Une mission s'ouvre-t-elle voilée dans l'atelier (SOG-0459) ? « new » (Créer) : jamais — l'auteur l'écrit ; « edit » (Modifier) et
 *  « dup » (Dupliquer), et tout autre mode : voilée, sauf `fullView === true` STRICTEMENT (la case « Voir le contenu complet des
 *  missions » du registre ; toute autre valeur — absente, « true » en texte, 1 — voile : échec fermé). Ne dépend JAMAIS de ce que la
 *  mission cache : le voile lui-même ne dit rien. */
export const veiledAt = (mode, fullView) => mode === 'new' ? false : fullView !== true;

/** La clé d'une ligne des Lieux dans le fichier : sa sorte et sa place dans la liste de sa sorte (« zone:0 ») ; '' pour une ligne
 *  ajoutée dans la séance (i = -1). */
const placeKey = r => r && Number.isInteger(r.i) && r.i >= 0 ? `${r.kind}:${r.i}` : '';

/** Les lignes des Lieux que le pilote ne voit pas au départ (voir l'en-tête) : la règle du lecteur, ED.pilotRows aucun tiroir ouvert.
 *  → [clé] triées ; [] pour une mission sans tiroir. */
export function veilHidden(doc) {
  const rows = placesOf(doc),
    kept = pilotRows(doc, rows, 0);
  return kept === rows ? [] : rows.filter((r, k) => kept[k] === null).map(placeKey).filter(Boolean).sort();
}

/** Les lignes que l'atelier voilé montre : une ligne cachée devient null, à son rang (voir l'en-tête). `hidden` : veilHidden. */
export function veilRows(rows, hidden) {
  const set = new Set(Array.isArray(hidden) ? hidden : []);
  return (Array.isArray(rows) ? rows : []).map(r => r && set.has(placeKey(r)) ? null : r);
}

/** « À compléter » de l'atelier voilé : celui du document SANS ses tiroirs (ni tiroir sans clé, ni lieu que rien ne cite — sans
 *  tiroir, rien n'est caché), et « des lieux à placer » seulement quand une ligne MONTRÉE l'est (`shown` : les lignes montrées). */
export function veilTodo(doc, shown) {
  const d = {
      ...obj(doc)
    },
    rows = (Array.isArray(shown) ? shown : []).filter(Boolean);
  delete d.phases;
  const unplaced = rows.some(p => !['dep', 'arr'].includes(p.kind) && !p.poly && (p.lat === '' || p.lon === ''));
  return todo(d).filter(t => t.key !== 'unplaced' || unplaced);
}

/** « À compléter » (voir l'en-tête) : les champs vides de chaque étape, jamais bloquants. */
export function todo(doc) {
  const d = obj(doc),
    m = obj(d.mission),
    arr = v => Array.isArray(v) ? v : [],
    out = [],
    // `vars` : ce que le mot nomme (le tiroir, la carte, la référence), pour les textes de editor_texts.js
    add = (step, key, vars) => out.push(vars ? {
      step,
      key,
      vars
    } : {
      step,
      key
    });
  if (!cut(d.title, 200)) add('cadre', 'title');
  // une liaison (famille commerciale) : ni théâtre, ni équipes, ni risques, ni chronologie à compléter (décision du 13 nov.)
  const link = liaison(m.type);
  if (!cut(m.theatre, 40) && !link) add('cadre', 'theatre');
  if (link && !cut(obj(arrOf(d.aircraft)[0]).type, 60)) add('cadre', 'aircraft');
  if (!placeText(d.origin)) add('cadre', 'dep');
  if (!placeText(d.destination)) add('cadre', 'arr');
  if (!link && !arr(d.teams).length && !arr(d.aircraft).length) add('teams', 'teams');
  // une liaison : la position d'un terrain vient de la base aéronautique par son code OACI, jamais à la main — rien à compléter
  for (const k of ['origin', 'destination']) {
    const p = obj(d[k]);
    if (!link && placeText(p) && (!Number.isFinite(+p.lat) || !Number.isFinite(+p.lon) || p.lat === null || p.lon === null)) add('places',
      k);
  }
  // les lieux sans position (un polygone se place par ses points) : un seul mot pour tous
  if (placesOf(d).some(p => !['dep', 'arr'].includes(p.kind) && !p.poly && (p.lat === '' || p.lon === ''))) add('places', 'unplaced');
  // SOG-0439 : une référence qui ne désigne aucun lieu ; un tiroir dont le point de déclenchement a été retiré (il ne s'ouvre plus qu'à
  // la main)
  // chacun est NOMMÉ (l'ergonome, 17 nov.) : le champ qui cite et l'identifiant absent, la lettre du tiroir — trois au plus par sorte
  for (const r of deadRefs(d).slice(0, 3)) add('places', 'deadRef', {
    id: cut(r.id, 40),
    where: r.where,
    name: cut(r.name, 60)
  });
  for (const name of drawersNoPoint(d).slice(0, 3)) add('places', 'drawerNoPoint', {
    name
  });
  // SOG-0445 : un tiroir dont la zone de passage, ou le point de l'arrivée, a été retiré
  for (const name of drawersNoKey(d).slice(0, 3)) add('places', 'drawerNoKey', {
    name
  });
  // SOG-0448 : dans une mission à tiroirs, un lieu que rien ne cite — le pilote ne le verra jamais ; nommé, trois au plus
  // le mot s'accorde à la sorte du lieu : clé uncited_zone, uncited_object, uncited_pt, uncited_rdv, uncited_target
  for (const u of uncited(d).slice(0, 3)) add('places', `uncited_${['zone', 'object', 'rdv', 'target'].includes(u.kind) ? u.kind : 'pt'}`, {
    id: u.id
  });
  // le récit d'une liaison est facultatif (décision du 13 nov.)
  if (!link && !String(d.summary ?? '').trim()) add('story', 'summary');
  if (!link && !String(d.detailed_description ?? '').trim()) add('story', 'description');
  if (!link && !arr(d.risks).length) add('risks', 'risks');
  // la chronologie de la mission : timeline.events (shared/mission_exercise.js) ; les cartes centrées sur un lieu sans position
  if (!link && !eventsOf(d).length) add('timeline', 'timeline');
  if (mapsOf(d).some(m => m.unplaced)) add('timeline', 'mapUnplaced');
  // SOG-0439 : une carte dont le lieu du centre a été retiré, nommée
  for (const name of mapsNoCentre(d).slice(0, 3)) add('timeline', 'mapNoCentre', {
    name
  });
  return out;
}

/** L'état d'une étape : 'ok' sans rien à compléter, 'todo' sinon. */
export const stepState = (doc, step) => todo(doc).some(t => t.step === step) ? 'todo' : 'ok';

/** Ajoute l'entrée d'une mission neuve au registre (voir l'en-tête) : refusée si l'identifiant y est déjà. */
export function regAdd(regDoc, entry) {
  const out = structuredClone(obj(regDoc));
  out.missions = Array.isArray(out.missions) ? out.missions : [];
  if (!entry || MS.readRegistry(out).some(r => r.id === entry.id || r.formerId === entry.id)) return {
    error: 'taken'
  };
  out.missions.push(entry);
  out.updatedAt = entry.addedAt || new Date().toISOString();
  return {
    doc: out
  };
}

/** Retouche la ligne d'une mission modifiée (voir l'en-tête) : la ligne à la place `idx` doit encore avoir l'identifiant `regId` (le
 *  registre a pu changer) ; titre, famille, sous-type, série, numéro, terrains ; un fichier déplacé (identifiant changé) : le dossier et
 *  le fichier de la ligne suivent, son identifiant reste — readRegistry le montre sous le nouveau, l'ancien gardé (formerId). */
export function regEdit(regDoc, idx, regId, cadre, path, now = new Date().toISOString()) {
  const out = structuredClone(obj(regDoc)),
    list = Array.isArray(out.missions) ? out.missions : [],
    raw = list[idx];
  if (!raw || typeof raw !== 'object' || cut(raw.id, 40) !== regId) return {
    error: 'stale'
  };
  const c = cadre || {},
    where = MS.missionPath(path),
    series = /^\d{1,5}$/.test(String(c.series ?? '').trim()) ? +String(c.series).trim() : '',
    num = /^[A-Z]-(\d{3})/.exec(cut(c.id, 40));
  raw.title = cut(c.title, 200);
  raw.family = cut(c.family, 24).toUpperCase();
  if (cut(c.subtype, 40)) raw.subtype = cut(c.subtype, 40);
  else delete raw.subtype;
  raw.series = series;
  if (num) raw.number = +num[1];
  raw.origin = placeIn(c.dep).name;
  raw.destination = placeIn(c.arr).name;
  if (where) {
    raw.folder = where.folder;
    raw.files = [where.file];
  }
  out.updatedAt = now;
  return {
    doc: out
  };
}

/** La forme d'un document lu : celle de frame/lib/mission.js (audits 182 et 186), pour tout lecteur qui réécrit. */
export const shapeOf = MS.shapeOf;

/** Vrai quand le document n'a pas changé (audit 182 : « Enregistrer » sans rien toucher n'écrit rien, le fichier reste identique). */
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Le texte du fichier (voir l'en-tête). */
export function yamlText(doc, Y, now = new Date().toISOString()) {
  return `# Mission — écrite par l'éditeur de la V3 (modules/missions, Compagnie › Registre)\n# ${now}\n${Y.dump(doc, {
    lineWidth: -1,
    noRefs: true
  })}`;
}
