// V3 frame/lib (propriétaire : la session « Création de missions » depuis le 17 nov. 2026, avant : Features SOG ; modules/missions et
// Carburant s'en servent) — les missions V2 lues telles qu'elles sont
// (modules/missions/SPEC.md § 2, § 4), en calcul pur : un fichier mission<ID>.yaml déjà lu (objet de js-yaml), une ligne du registre
// missions/mission_registry.yaml, le vol qu'une mission donne à Carburant. Ni page, ni stockage, ni réseau : l'appelant lit les
// fichiers (ctx.data) et le YAML (frame/lib/js-yaml.min.js, le lecteur du cadre).
//
// API :
//   readMission(doc) → mission { id, type, subtype, theatre, country, title, summary, organisation, operation, origin, destination, target, points,
//     routeOrder, aircraft, cruiseLevelFt, cruiseSpeedKt, estimate, notes, constraints, risks, category, teams, zones, rendezvous,
//     turns, maps, objectives, payload, details, hasCoords } ; null sans mission.id ou mission.type (seuls champs exigés). origin /
//     destination / target : { name, icao, lat, lon } ou null ; points : { id → { id, name, lat, lon, kind } } (tournants, rendez-vous,
//     zones par leur centre, cible). La fiche en deux niveaux (§ 10.45, SOG-0051), tout facultatif et borné (le fichier est écrit par
//     n'importe quel pilote, audit 157) : risks [{ hazard, consequence, mitigation }] (40), teams [{ name, service, type, role }] (40),
//     zones [{ id, name, kind, lat, lon, radiusKm (≤ 500), polygon, role, timeMin }] (40), rendezvous [{ id, name, lat, lon,
//     participants, role }] et turns [{ id, name, role, lat, lon }] (60 points), maps [{ id, file (motif strict, un nom de fichier du
//     dossier de la mission), type, description, centreRef }] (20), objectives { primary, secondary }, payload { description, massKg,
//     passengers }, details [paragraphe] (2 000 caractères chacun), hasCoords (un lieu, un point ou une zone situé).
//     theatre : le théâtre (`mission.theatre`), un texte nettoyé coupé à 40 signes, sinon '' ; country : le pays (`mission.country`), exactement
//     deux lettres majuscules (« FR »), sinon '' — publics : pilotView les rend tels quels (SOG-0455).
//     mapLook { base: 'fast' | 'relief', airspaces: bool } : le fond et la couche de la carte de la mission (SOG-0456 ; la clé
//     `mission_map`, bornée par mapLook(v) — exportée : l'atelier s'en sert aussi).
//     visible(v) → le texte sans ses caractères de format invisibles (contrôles de sens d'écriture, espace de largeur nulle…) : tout
//     texte lu d'un fichier passe par là ; l'atelier l'emploie aussi.
//     drawerSlots(doc) → [{ i, id }] : les parties de `phases` qui sont des tiroirs (leur place, leur lettre) — la règle
//     d'acceptation, partagée avec l'atelier (modules/missions/editor_drawers.js).
//     Les tiroirs (SOG-0440) : drawers [{ id (B à M), rank (1 à 12 : ce que l'écran dit), title, trigger, message, brief, key, keyWhy,
//     condition, emits, route, routeUnknown }] (douze au plus) et drawersRefused (les parties écartées : identifiant hors liste ou en
//     double, au-delà de douze). key, la géométrie
//     toujours RÉSOLUE (que le fichier l'écrive dans la partie ou la cite par identifiant) :
//       { kind: 'time', point (un point de la mission ou 'ORIGIN'), delayMin }
//       { kind: 'zone', shape: { circle: { lat, lon, radiusM } } | { polygon: [[lat, lon]…] }, ceilingFt | null, zoneId | null, shown
//         (vrai SEULEMENT quand le fichier écrit `zone_shown: true`, le booléen : la clé absente, « true » en texte, 1… → cachée —
//         SOG-0459), actor (la cible qui franchit la zone à la place du pilote : un objet, ou null), fallbackMin | null }
//       { kind: 'object', object: { id, kind, name, lat, lon, rangeNm, heightFt | null, altitudeFt | null, confirm, moving, motion },
//         fallbackMin | null }
//       { kind: 'arrival', point, at: { lat, lon }, radiusNm, speedMaxKt, onGround, required: [{ id, lat, lon }], escortMinSec,
//         fallbackMin | null }
//       { kind: 'condition', condition: 'hover' | 'landing' | 'overflight' | 'sequence' | 'event', rule | steps | event, fallbackMin } (les
//         conditions de la version 1.1 de l'atelier : lues bornées, pas encore jugées en vol)
//       { kind: 'hand', fallbackMin | null }
//     keyWhy : '' | 'several' | 'zone' | 'object' | 'actor' | 'condition' | 'point' | 'delay' ; condition : le genre de trigger_condition
//     écrit ; emits : { id, to } (le message envoyé aux autres équipages à l'ouverture) ou null ; route : la suite de route en points résolus (la forme de missionFlight) — jamais dans turns, routeNm ni missionFlight.
//   OBJECT_KINDS, DRAWER_IDS, DRAWER_BOUNDS : les genres d'objet (liste fermée), les identifiants des tiroirs, les bornes de lecture.
//   notJudgedYet(key) : vrai pour une clé que le vol ne sait pas encore juger (condition 1.1, cible qui franchit, objet mobile, suivi).
//   passageMin(mission, pointId) → { nm, min | null } : la distance et le temps estimé du départ au passage d'un point de la partie A
//     ('ORIGIN' : 0) ; null si le point n'est pas dans la route de la partie A.
//   readRegistry(doc) → [ligne { id, family, title, operation, types, origin, destination, originIcao, destinationIcao, blockMin,
//     folder, file, organisation, kind, subtype, callsigns, words, category }] : les lignes du registre, les organisations (…Z) marquées ; folder et file vides quand le
//     registre en donne un qui n'est pas sûr (le chemin n'est jamais pris tel quel : un pilote peut écrire le registre).
//   missionPath(path) → { folder, file, id } : le fichier de mission d'un dossier de mission du dépôt (« missions/A_COMBAT/A-001A/
//     missionA-001A.yaml ») ; null pour tout autre fichier (versions/, recu/, résumé) ou un chemin pas sûr.
//   rowOfMission(doc, path) → une ligne comme celles de readRegistry, tirée du fichier d'une mission absente du registre (SOG-0036) ;
//     null si le fichier n'est pas une mission de ce dossier (id différent du dossier, mission.id ou mission.type absents).
//   shapeOf(doc) → '' | 'alias' | 'size' : un document lu qui ne se réécrit pas sans risque (ancre YAML, plus de NODES_MAX nœuds) ;
//     tout lecteur qui réécrit (éditeur, registre, « Ajouter », « Changer de compagnie ») le refuse avant (audits 182 et 186).
//   icaoOf(name) : le code OACI entre parenthèses à la fin d'un nom (« BA 118 Mont-de-Marsan (LFBM) » → « LFBM ») ; '' sinon.
//   levelFt(text) : « FL240 » → 24000, « 1500 ft » → 1500, un nombre tel quel ; null sinon.
//   pilotView(mission, opened, { mine = true }) → CE QUE LE PILOTE PEUT VOIR (SOG-0448, « le secret d'un tiroir fermé » ; SOG-0459,
//     « l'existence même des tiroirs est cachée ») : la mission lue, dans la même forme, où un lieu, une zone, un rendez-vous ou la
//     cible n'est gardé que s'il est cité par la partie visible (sa route `routeOrder`, le centre d'une de ses cartes) ou par un tiroir
//     OUVERT (sa zone, le point de sa clé, ses arrêts, sa suite de route) ; la zone de passage d'un tiroir fermé aussi quand le fichier
//     écrit `zone_shown: true` — gardée dans `zones` comme une zone ordinaire, rien ne la lie au tiroir. `drawers` : les tiroirs
//     OUVERTS seuls, entiers, dans l'ordre du fichier, avec leur `rank` ; un tiroir fermé n'y est PAS (ni titre, ni clé, ni compte) ;
//     `drawersRefused` : 0. `opened` : les lettres des tiroirs ouverts de MA mission (une entrée bornée : seules les lettres de
//     DRAWER_IDS comptent) ; `mine: false` (une mission qu'on feuillette) : la partie visible seule — et de même pour tout `mine` qui
//     n'est pas exactement `true`, ou des options illisibles (échec fermé). Une mission SANS tiroir est rendue telle quelle (ses
//     parties écartées ne sont pas comptées) ; une mission dont tous les tiroirs sont fermés a `drawers: []`. Ajoute
//     `pilot: { mine, opened }` — aucun compte de ce qui est caché. `profileRoute` (le texte `vertical_profile.route`, dont la Carte tire
//     ses jetons) et `profilePoints` ([{ id, name, lat, lon, alt_ft }], `route_points` : id = `id` sinon `name` tel qu'écrit, name = le nom ou '',
//     alt_ft = l'altitude à atteindre au point, un nombre de 0 à 60 000, sinon null) : readMission les rend bornés ; la vue en retire
//     tout jeton ou point qui nomme un lieu qu'elle ne garde pas — par son identifiant ou son nom, un nom de plusieurs mots (« Port Alpha »)
//     aussi, entre blancs, virgule ou point-virgule, son « /niveau » avec lui, sans manger le nom d'un lieu gardé (SOG-0459) — les autres jetons (niveau, ORIGIN…) restent, et le jeton
//     revient avec le tiroir ouvert. Pour AFFICHER seulement : le suivi des clés en vol et l'atelier
//     lisent la mission entière (readMission). null sans mission.
//   missionFlight(mission, assignment) → { route: { dep, arr, points, depAt, arrAt }, aircraft: { type, registration }, levelFt, speedKt, mission,
//     category } (le vol que Carburant pose ; § 4 de la SPEC) ; null sans mission.
//   lockedPoint(p) : vrai pour un point que la mission impose (rendez-vous, cible, source par son rôle) ; missionFlight le marque
//     lock: 'mission' (SOG-0193 L3, V3 § 10.47 c).
//   routeNm(mission) → la longueur en NM du trajet de la mission (origine, points dans l'ordre de missionFlight, destination ; les lieux
//     sans position sautés) ; null sans deux positions.
//   categoryOf(v) : l'identifiant de catégorie d'une mission (SOG-0041, § 10.38 ; la forme des identifiants de
//     frame/lib/mission_categories.js), '' sinon ; le nom et la charge se lisent dans la liste de la compagnie (forAirline).

import {
  isCode
} from './adnames.js'; // le test d'un code de terrain est celui du champ commun (SOG-0465), une fonction pure de adnames.js (sans écran), jamais recopiée ici
import {
  visible,
  clean,
  plain,
  idWord
} from './untrusted.js';
export {
  visible
};

// Les gardes d'entrée non fiable (un texte sans ses caractères de format invisibles, un texte nettoyé, un objet simple, un identifiant écrit) sont
// ceux du cadre (frame/lib/untrusted.js, une seule définition) ; `visible` reste exporté d'ici : l'atelier (modules/missions/) le lit par le lecteur.
/** Un nombre fini, ou null. */
const num = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v;

/** Un texte nettoyé et coupé à n caractères. */
const cut = (v, n = 300) => clean(v).slice(0, n);
/** Une liste (une valeur seule devient une liste d'un élément), coupée à n éléments. */
const list = (v, n) => (Array.isArray(v) ? v : v ? [v] : []).slice(0, n);
/** Une latitude, une longitude dans leurs bornes ; null sinon. */
const latOf = v => num(v) !== null && Math.abs(+v) <= 90 ? +v : null;
const lonOf = v => num(v) !== null && Math.abs(+v) <= 180 ? +v : null;
/** Le nom d'un fichier de carte fourni : un nom seul (ni dossier, ni point en tête), .png ; '' sinon (jamais un chemin, audit 157). */
const mapFile = v => {
  const f = clean(v);
  return /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\.png$/i.test(f) ? f : '';
};

/** Le code OACI à la fin d'un nom (voir l'en-tête) : un code de terrain au sens du champ commun (`isCode` de adnames.js : quatre signes,
 *  ou le code de liste d'une hélistation « XT123 ») portant au moins une lettre ; le motif n'est écrit nulle part ici. */
export function icaoOf(name) {
  const m = /\(([A-Z0-9]{4,5})\)\s*$/.exec(clean(name).toUpperCase());
  return m && /[A-Z]/.test(m[1]) && isCode(m[1]) ? m[1] : '';
}
/** Le code d'un lieu lu : son `icao` écrit s'il est un code de terrain (isCode), sinon celui de son nom (icaoOf). */
const placeIcao = p => {
  const w = String(p?.icao ?? '');
  return w && isCode(w) ? w : icaoOf(p?.name);
};

/** Un niveau écrit (voir l'en-tête). */
export function levelFt(text) {
  if (typeof text === 'number') return Number.isFinite(text) ? text : null;
  const s = clean(text).toUpperCase().replace(/\s/g, '');
  let m = /^FL(\d{2,3})$/.exec(s);
  if (m) return +m[1] * 100;
  m = /^(\d+(?:\.\d+)?)(FT)?$/.exec(s);
  return m ? Math.round(+m[1]) : null;
}

/** Un lieu de la mission (origine, destination, cible…) : { name, icao, lat, lon }, ou null sans nom ni position. */
const placeOf = p => {
  if (!p || typeof p !== 'object') return null;
  const name = clean(p.name),
    lat = num(p.lat),
    lon = num(p.lon);
  return name || lat !== null ? {
    name,
    icao: icaoOf(name),
    lat,
    lon
  } : null;
};

/** Le centre d'une zone : son centre écrit, sinon la moyenne de ses sommets ; null sinon. */
const centreOf = z => {
  const c = z?.centre || z?.center;
  if (c && num(c.lat) !== null) return [num(c.lat), num(c.lon)];
  if (num(z?.lat) !== null) return [num(z.lat), num(z.lon)];
  // les sommets : la première des trois clés qui est une liste (un « points: 5 » faisait échouer toute la lecture)
  const pts = ([z?.points, z?.polygon, z?.vertices].find(Array.isArray) || []).filter(p => num(p?.lat) !== null && num(p?.lon) !== null);
  return pts.length ? [pts.reduce((a, p) => a + +p.lat, 0) / pts.length, pts.reduce((a, p) => a + +p.lon, 0) / pts.length] : null;
};

/** La fiche en deux niveaux (voir l'en-tête, § 10.45) : équipes, zones, rendez-vous, tournants, cartes, objectifs, charge, description. */
function sheetOf(d) {
  const zones = list(d.zones, 40).map(z => {
      const c = centreOf(z),
        r = num(z?.radius_km ?? z?.radiusKm);
      return {
        id: cut(z?.id, 40),
        name: cut(z?.name, 120),
        kind: cut(z?.kind, 40),
        lat: c ? latOf(c[0]) : null,
        lon: c ? lonOf(c[1]) : null,
        radiusKm: r !== null && r > 0 && r <= 500 ? r : null,
        polygon: [z?.points, z?.polygon, z?.vertices].some(a => Array.isArray(a) && a.length > 2),
        role: cut(z?.role, 200),
        timeMin: num(z?.time_on_task_min) !== null && +z.time_on_task_min >= 0 && +z.time_on_task_min < 10000 ? Math.round(+z
          .time_on_task_min) : null
      };
    }).filter(z => z.id || z.name),
    spot = p => ({
      id: cut(p?.id, 40),
      name: cut(p?.name, 120),
      lat: latOf(p?.lat),
      lon: lonOf(p?.lon),
      role: cut(p?.role, 200)
    }),
    rdv = list(d.rendezvous, 60).map(p => ({
      ...spot(p),
      participants: list(p?.participants, 20).map(x => cut(x, 60)).filter(Boolean)
    })).filter(p => p.id || p.name),
    turns = list(d.turning_points, 60).map(spot).filter(p => p.id || p.name),
    o = d.objectives,
    pl = d.payload && typeof d.payload === 'object' ? d.payload : {},
    places = [d.origin, d.destination, d.target].filter(p => latOf(p?.lat) !== null && lonOf(p?.lon) !== null);
  return {
    summary: visible(d.summary).trim().slice(0, 2000),
    teams: list(d.teams, 40).map(t => ({
      name: cut(t?.name, 80),
      service: cut(t?.service, 120),
      type: cut(t?.type, 60),
      role: cut(t?.role, 200)
    })).filter(t => t.name || t.role),
    zones,
    rendezvous: rdv,
    turns,
    maps: list(d.maps, 20).map(x => typeof x === 'string' ? {
      filename: x
    } : x || {}).map(x => ({
      id: cut(x.id, 40),
      file: mapFile(x.filename ?? x.file),
      type: cut(x.type, 40),
      description: cut(x.description, 300),
      centreRef: cut(x.centre_ref ?? x.center_ref, 40)
    })),
    objectives: {
      primary: Array.isArray(o) ? '' : cut(o?.primary, 2000),
      secondary: (Array.isArray(o) ? o : list(o?.secondary, 20)).slice(0, 20).map(x => cut(x, 300)).filter(Boolean)
    },
    payload: {
      description: cut(pl.description, 2000),
      massKg: num(pl.mass_kg) !== null && +pl.mass_kg > 0 && +pl.mass_kg < 1e6 ? +pl.mass_kg : null,
      passengers: Number.isInteger(num(pl.passengers)) && +pl.passengers > 0 && +pl.passengers < 10000 ? +pl.passengers : null
    },
    details: visible(d.detailed_description).split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim().slice(0, 2000)).filter(Boolean)
      .slice(0, 30),
    hasCoords: !!(places.length || turns.some(p => p.lat !== null && p.lon !== null) || rdv.some(p => p.lat !== null && p.lon !== null) ||
      zones.some(z => z.lat !== null && z.lon !== null))
  };
}

// ---------------------------------------------------------------- les tiroirs (SOG-0440 ; organisation/SPEC_MISSIONS_TIROIRS.md § 7, § 10.3)
// Un tiroir est une partie de la V2 (`phases` ; douze au plus, identifiants B à M) ; il a UNE clé. Deux formes d'écriture, lues toutes les deux :
//   · PAR IDENTIFIANT (l'atelier de l'utilisateur, « Mission Editor ») : `trigger_zone: ZONE-1` désigne une zone de `zones`,
//     `trigger_object: OBJ-1` un objet de `objects`, en tête de mission ;
//   · DANS LA PARTIE (lue, jamais écrite par l'atelier de la V3, qui écrit par identifiant — Q-0095) : `trigger_zone: { centre, radius_km | points, ceiling_ft }`, `trigger_object: { kind, lat, lon,
//     detection_range_nm, detection_height_ft, … }` — la fiche technique de la V2 affiche toute clé inconnue du premier niveau (seul
//     `phases` y est masqué) : une zone cachée ou un objet à trouver écrits en tête s'y lisent avant le départ.
// Les clés : trigger_zone (+ zone_shown, + trigger_actor : c'est la cible, pas le pilote, qui franchit la zone) ; trigger_object ;
// trigger_condition { kind: arrival, point, radius_nm, speed_max_kt, require_on_ground, required_points, escort_min_sec } ; trigger_point +
// trigger_delay_min (l'heure de la V2) ; rien : le geste du pilote seul. fallback_delay_min : l'heure de repli (minutes après le
// décollage) de toute clé qui regarde l'avion. Le format entier : docs/technique/FORMAT_MISSION.md.
// Le fichier est une entrée non fiable : une valeur hors bornes n'est jamais ramenée dans ses bornes (une zone rétrécie serait une autre
// zone) — la clé est dite illisible et le tiroir ne s'ouvre plus qu'à la main ou à son heure de repli. Le bloc privé `x_mission_editor`,
// `coordination` et `emit_event` ne sont pas lus (gardés tels quels par qui réécrit).

/** Les genres d'un objet à trouver : la liste fermée, à allonger ICI seulement (l'éditeur et l'écran du pilote la lisent) ; `aircraft` :
 *  une cible mobile. */
export const OBJECT_KINDS = Object.freeze(['wreck', 'raft', 'person', 'vehicle', 'container', 'ship', 'smoke', 'aircraft']);
/** Les identifiants des tiroirs dans le fichier, dans l'ordre (la partie A est le reste de la mission) : douze au plus, la borne de
 *  sécurité de la lecture (l'utilisateur, 17 nov. : « pourquoi limiter à 3 tiroirs ? » — la limite à B, C, D venait du générateur de la
 *  V2). À l'écran un tiroir se dit par son RANG (« Tiroir 1 ») : les lettres désignent déjà les équipages d'une opération. */
export const DRAWER_IDS = Object.freeze(['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);
/** Les bornes d'un tiroir lu (celles de l'atelier de l'utilisateur, FORMAT.md « Mission Editor 1.0 ») : textes (signes), délais
 *  (minutes), rayon d'une zone (km, 0 exclu), sommets, pieds (plafond, hauteur de détection), altitude d'un objet (ft), portée et rayon
 *  d'arrivée (NM, 0 exclu), vitesses (kt), suivi (s), longueurs de listes. */
export const DRAWER_BOUNDS = Object.freeze({
  title: 120,
  trigger: 200,
  message: 2000,
  brief: 20000,
  delayMin: 1440,
  radiusKm: 500,
  vertices: Object.freeze([3, 100]),
  feet: 60000,
  altitudeFt: Object.freeze([-1500, 60000]),
  rangeNm: 100,
  speedKt: 1000,
  escortSec: 3600,
  route: 60,
  required: 20,
  steps: 10,
  scanned: 20,
  listed: 60
});
/** Les mots d'une route qui disent le départ ou l'arrivée (jamais un point de la liste). */
const ROUTE_START = new Set(['ORIGIN', 'DEPART', 'DEPARTURE']),
  ROUTE_END = new Set(['DESTINATION', 'ARRIVAL', 'ARRIVEE']);
/** Un texte de plusieurs lignes, ses fins de ligne ramenées à « \n », borné. */
const para = (v, n) => typeof v === 'string' || typeof v === 'number' ? visible(v).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim()
  .slice(0, n) : '';
/** Un nombre du fichier dans [lo, hi] ; null sinon (un texte qui n'est pas un nombre, un booléen, hors bornes). */
const within = (v, lo, hi) => (typeof v === 'number' || typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v)) && +v >= lo && +v <= hi ?
  +v : null;
/** Un nombre du fichier dans ]0, hi] ; null sinon. */
const positive = (v, hi) => {
  const n = within(v, 0, hi);
  return n !== null && n > 0 ? n : null;
};
/** La longueur au plus du texte du cheminement du profil vertical (`profileRoute`). */
const PROFILE_TEXT = 2000;
/** Oui ou non écrit dans le fichier (false, 0, « non », « no », « false » : non) ; `dflt` quand rien n'est écrit. */
const yes = (v, dflt) => v === undefined || v === null || v === '' ? dflt : !(v === false || v === 0 || /^(false|no|non|0)$/i.test(String(v)
  .trim()));
/** L'entrée d'une liste du fichier (ou d'un objet seul) qui porte cet identifiant, parmi les `max` premières ; null sinon. */
const byId = (v, id, max) => id ? (Array.isArray(v) ? v : plain(v) ? [v] : []).slice(0, max).find(x => plain(x) && idWord(x.id) === id) ||
  null : null;

/** Une zone de passage (écrite dans la partie, ou une zone de `zones`) → { shape: { circle: { lat, lon, radiusM } } | { polygon: [[lat,
 *  lon]…] }, ceilingFt } ; null quand elle est illisible. Des sommets font un polygone, sinon le centre et le rayon un cercle. */
function zoneKey(z) {
  const o = plain(z);
  if (!o) return null;
  const B = DRAWER_BOUNDS,
    pts = [o.points, o.polygon, o.vertices].find(a => Array.isArray(a) && a.length),
    ceil = within(o.ceiling_ft, 0, B.feet),
    ceilingFt = ceil === null ? null : Math.round(ceil);
  if (pts) {
    if (pts.length < B.vertices[0] || pts.length > B.vertices[1]) return null;
    const poly = pts.map(p => [within(plain(p)?.lat, -90, 90), within(plain(p)?.lon, -180, 180)]);
    return poly.some(p => p[0] === null || p[1] === null) ? null : {
      shape: {
        polygon: poly
      },
      ceilingFt
    };
  }
  const c = plain(o.centre) || plain(o.center) || o,
    lat = within(c.lat, -90, 90),
    lon = within(c.lon, -180, 180),
    r = positive(o.radius_km, B.radiusKm);
  return lat === null || lon === null || r === null ? null : {
    shape: {
      circle: {
        lat,
        lon,
        radiusM: Math.max(1, Math.round(r * 1000))
      }
    },
    ceilingFt
  };
}

/** Un objet à trouver (écrit dans la partie, ou un objet de `objects`) → { id, kind, name, lat, lon, rangeNm, heightFt, altitudeFt,
 *  confirm, moving, motion } ; null quand il est illisible (sans position ou sans portée dans leurs bornes). Un genre que OBJECT_KINDS
 *  ne connaît pas : '' (l'objet reste jouable). confirm : trouvé à portée ET sur le mot du pilote (vrai par défaut). motion : null pour
 *  un objet fixe ; { kind: 'route', route (points résolus), speedKt, startDelayMin } ou { kind: 'axis', courseDeg, speedKt,
 *  startDelayMin } pour une cible mobile — lue et bornée, pas encore jugée en vol. `resolve` : un identifiant → un point de la mission. */
function objectKey(v, resolve) {
  const o = plain(v);
  if (!o) return null;
  const B = DRAWER_BOUNDS,
    c = plain(o.centre) || plain(o.center) || o,
    lat = within(c.lat, -90, 90),
    lon = within(c.lon, -180, 180),
    range = positive(o.detection_range_nm, B.rangeNm),
    h = within(o.detection_height_ft, 0, B.feet),
    alt = within(o.altitude_ft, B.altitudeFt[0], B.altitudeFt[1]),
    kind = cut(o.kind, 40).toLowerCase(),
    speed = positive(o.speed_kt, B.speedKt),
    delay = within(o.start_delay_min, 0, B.delayMin),
    course = within(o.course_deg, 0, 360),
    route = (Array.isArray(o.route_order) ? o.route_order : []).slice(0, B.route).map(resolve).filter(Boolean),
    axis = cut(o.motion, 20).toLowerCase() === 'axis' || !route.length && course !== null && speed !== null;
  if (lat === null || lon === null || range === null) return null;
  return {
    id: cut(o.id, 40),
    kind: OBJECT_KINDS.includes(kind) ? kind : '',
    name: cut(o.name, 120),
    lat,
    lon,
    rangeNm: range,
    heightFt: h === null ? null : Math.round(h),
    altitudeFt: alt === null ? null : Math.round(alt),
    confirm: yes(o.require_confirmation, true),
    hiddenUntil: EVENT_ID.test(String(o.hidden_until_event ?? '')) ? String(o.hidden_until_event) :
    '', // caché au pilote jusqu'à cet événement
    moving: !!(speed !== null && (axis ? course !== null : route.length)),
    motion: speed === null ? null : axis ? course === null ? null : {
      kind: 'axis',
      courseDeg: course,
      speedKt: speed,
      startDelayMin: delay === null ? 0 : Math.round(delay)
    } : route.length ? {
      kind: 'route',
      route,
      speedKt: speed,
      startDelayMin: delay === null ? 0 : Math.round(delay)
    } : null
  };
}

/** Les conditions de maintien et de survol de l'atelier (version 1.1). */
const HOLD_KINDS = Object.freeze(['hover', 'landing', 'overflight']);
/** L'identifiant d'un événement entre équipages, d'un destinataire : un mot court, jamais un texte libre. */
const EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;

/** Une règle de maintien (hover : stationnaire ; landing : poser) ou de survol (overflight) de l'atelier → { kind, label, point, at,
 *  object, radiusM, radiusNm, durationSec, maxGapSec, speedMaxKt, speedToleranceKt, heightMinFt, heightMaxFt, confirmation, confirm } —
 *  les champs de son genre, null pour les autres ; null quand elle est illisible (un point ET un objet, ou aucun ; un nombre exigé
 *  absent ou hors bornes ; une hauteur minimale au-dessus de la maximale). `place` : un identifiant → { lat, lon } ; `object` : un
 *  identifiant → l'objet résolu. Lue et bornée : le vol ne juge encore aucune de ces règles. */
function holdRule(c, place, object) {
  const kind = cut(c.kind, 24).toLowerCase(),
    pid = idWord(c.point),
    oid = idWord(c.object);
  if (!HOLD_KINDS.includes(kind) || !pid === !oid) return null;
  const at = pid ? place(pid) : null,
    obj = oid ? object(oid) : null,
    opt = (v, lo, hi, dflt) => v === undefined || v === null ? dflt : within(v, lo, hi),
    over = kind === 'overflight',
    hover = kind === 'hover',
    r = {
      kind,
      label: cut(c.label, 120),
      point: pid ? ROUTE_END.has(pid) ? 'DESTINATION' : ROUTE_START.has(pid) ? 'ORIGIN' : pid : null,
      at,
      object: obj,
      radiusM: over ? null : within(c.radius_m, 0.1, 10000),
      radiusNm: over ? within(c.radius_nm, 0.001, DRAWER_BOUNDS.rangeNm) : null,
      durationSec: over ? null : within(c.duration_sec, 1, 3600),
      maxGapSec: over ? null : within(c.max_gap_sec, 0.1, 60),
      speedMaxKt: kind === 'landing' ? opt(c.speed_max_kt, 0, 50, 3) : null,
      speedToleranceKt: hover ? within(c.speed_tolerance_kt, 0, 100) : null,
      heightMinFt: kind === 'landing' ? null : within(c.height_min_ft, 0, DRAWER_BOUNDS.feet),
      heightMaxFt: kind === 'landing' ? null : within(c.height_max_ft, 0, DRAWER_BOUNDS.feet),
      confirmation: /^[a-z][a-z0-9_]{0,23}$/.test(String(c.confirmation ?? '')) ? String(c.confirmation) : '',
      confirm: over ? yes(c.require_confirmation, true) : false
    },
    need = over ? ['radiusNm', 'heightMinFt', 'heightMaxFt'] : hover ? ['radiusM', 'durationSec', 'maxGapSec', 'speedToleranceKt',
      'heightMinFt', 'heightMaxFt'
    ] : ['radiusM', 'durationSec', 'maxGapSec', 'speedMaxKt'];
  return (pid ? !at : !obj) || need.some(k => r[k] === null) || r.heightMinFt !== null && r.heightMinFt > r.heightMaxFt ? null : r;
}

/** Le message qu'un tiroir envoie en s'ouvrant (emit_event de l'atelier, version 1.1) → { id, to: [destinataire…] } ; null sans
 *  message ou quand il est illisible (seize destinataires au plus). */
function emitOf(v) {
  const e = plain(v),
    to = e && Array.isArray(e.to) ? e.to.slice(0, 16).map(x => String(x ?? '')) : [];
  return e && EVENT_ID.test(String(e.id ?? '')) && to.length && to.every(x => EVENT_ID.test(x)) ? {
    id: String(e.id),
    to
  } : null;
}

/** Les parties d'une mission qui sont des tiroirs : [{ i (la place dans `phases`), id (B à M) }], douze au plus, dans l'ordre du
 *  fichier — LA règle d'acceptation, partagée par le lecteur (drawersOf) et par l'atelier (modules/missions/editor_drawers.js : une
 *  ligne par tiroir, les autres parties gardées telles quelles). Écartées : une valeur nue, un identifiant hors de B à M, un doublon,
 *  au-delà de douze, au-delà des entrées lues. Sans identifiant : la lettre de sa place (la V2 ne contrôle rien, un fichier écrit à
 *  la main doit se lire). */
export function drawerSlots(doc) {
  const d = plain(doc) || {},
    all = Array.isArray(d.phases) ? d.phases : plain(d.phases) ? [d.phases] : [],
    out = [];
  all.slice(0, DRAWER_BOUNDS.scanned).forEach((raw, i) => {
    const p = plain(raw),
      id = p ? cut(p.id, 8).toUpperCase() || DRAWER_IDS[i] || '' : '';
    if (p && DRAWER_IDS.includes(id) && !out.some(x => x.id === id) && out.length < DRAWER_IDS.length) out.push({
      i,
      id
    });
  });
  return out;
}

/** Vrai pour une clé que le vol ne sait pas encore juger (à dire à l'écran : « pas encore jugé en vol — s'ouvre à l'heure de repli ou au
 *  geste ») : une condition de la version 1.1, une zone franchie par une cible, un objet qui se déplace, un suivi exigé. */
export const notJudgedYet = key => !!key && (key.kind === 'condition' || !!key.actor || !!key.object?.moving || key.escortMinSec > 0);

/** Les tiroirs d'une mission (voir l'en-tête) : { drawers, drawersRefused }. `d` : le document ; `points` : les points de la mission
 *  (readMission). Une partie de la V2 se lit telle quelle : avec un point de déclenchement, la clé « heure » ; sans, le geste seul.
 *  Plusieurs clés dans un fichier écrit à la main : la zone, puis l'objet, puis la condition, puis l'heure (keyWhy 'several'). Une clé
 *  illisible → { kind: 'hand' } et keyWhy : 'zone', 'object', 'actor', 'condition' (illisible, ou d'un genre que ce lecteur ne lit pas :
 *  `condition` le nomme), 'point' (le lieu n'existe pas), 'delay'. key.fallbackMin : l'heure de repli, sur toute clé sauf l'heure. */
function drawersOf(d, points) {
  const B = DRAWER_BOUNDS,
    all = Array.isArray(d.phases) ? d.phases : plain(d.phases) ? [d.phases] : [],
    slots = drawerSlots(d),
    byKey = new Map(Object.entries(points).map(([id, p]) => [id.toUpperCase(), p])),
    spot = p => latOf(p?.lat) !== null && lonOf(p?.lon) !== null ? {
      lat: latOf(p.lat),
      lon: lonOf(p.lon)
    } : null,
    // un identifiant de route → un point de la mission, dans la forme de missionFlight ; null pour le départ, l'arrivée ou un inconnu
    resolve = x => {
      const word = idWord(plain(x) ? x.id : x).split('/')[0].trim(),
        pt = byKey.get(word);
      return pt ? flightPoint(pt) : null;
    },
    // la position d'un lieu nommé par une condition : l'arrivée, le départ, un point ou une zone de la mission
    placeAt = id => ROUTE_END.has(id) ? spot(d.destination) || spot(d.origin) : ROUTE_START.has(id) ? spot(d.origin) : spot(byKey.get(id)),
    drawers = [];
  // la cible sans identifiant est « TARGET » (la règle de la V2 et de l'atelier)
  if (!byKey.has('TARGET') && spot(d.target)) byKey.set('TARGET', {
    id: 'TARGET',
    name: clean(d.target.name),
    ...spot(d.target),
    kind: 'target',
    role: ''
  });
  // les parties écartées : toutes celles que drawerSlots ne retient pas (au-delà des entrées lues comprises)
  const refused = all.length - slots.length;
  slots.forEach(({
    i,
    id
  }) => {
    const p = all[i],
      has = k => p[k] !== undefined && p[k] !== null && p[k] !== '',
      keys = ['trigger_zone', 'trigger_object', 'trigger_condition', 'trigger_point'].filter(has),
      fb = within(p.fallback_delay_min, 0, B.delayMin),
      fallbackMin = fb === null ? null : Math.round(fb),
      hand = {
        kind: 'hand',
        fallbackMin
      };
    // un délai sans point (la trace d'un lieu retiré par l'éditeur, SOG-0439) est le geste seul : jamais une clé illisible
    let key = hand,
      keyWhy = keys.length > 1 ? 'several' : '',
      condition = '';
    if (keys[0] === 'trigger_zone') {
      const zid = idWord(p.trigger_zone),
        z = zoneKey(zid ? byId(d.zones, zid, 40) : p.trigger_zone),
        aid = idWord(p.trigger_actor),
        actor = aid ? objectKey(byId(d.objects, aid, B.listed), resolve) : null;
      if (!z) keyWhy = 'zone';
      else if (has('trigger_actor') && !actor) keyWhy = 'actor';
      else key = {
        kind: 'zone',
        ...z,
        zoneId: zid ? cut(p.trigger_zone, 40) : null,
        shown: p.zone_shown === true, // SOG-0459 : montrée seulement quand le fichier l'écrit (le booléen) ; absente → cachée
        actor, // la cible qui franchit la zone à la place du pilote ; null : le pilote
        fallbackMin
      };
    } else if (keys[0] === 'trigger_object') {
      const oid = idWord(p.trigger_object),
        o = objectKey(oid ? byId(d.objects, oid, B.listed) : p.trigger_object, resolve);
      if (o) key = {
        kind: 'object',
        object: o,
        fallbackMin
      };
      else keyWhy = 'object';
    } else if (keys[0] === 'trigger_condition') {
      const c = plain(p.trigger_condition) || {},
        kind = cut(c.kind, 24).toLowerCase(),
        at = placeAt(idWord(c.point)),
        radius = positive(c.radius_nm, B.rangeNm),
        speed = within(c.speed_max_kt, 0, B.speedKt),
        escort = c.escort_min_sec === undefined || c.escort_min_sec === null ? 0 : within(c.escort_min_sec, 0, B.escortSec),
        req = (Array.isArray(c.required_points) ? c.required_points : c.required_points === undefined || c.required_points === null ?
        [] : [
            null
          ]).slice(0, B.required).map(x => {
          const w = idWord(x),
            q = placeAt(w);
          return q ? {
            id: ROUTE_END.has(w) ? 'DESTINATION' : ROUTE_START.has(w) ? 'ORIGIN' : byKey.get(w).id,
            ...q
          } : null;
        });
      condition = /^[a-z][a-z0-9_]{0,23}$/.test(kind) ? kind : '';
      // les conditions de la version 1.1 de l'atelier : lues bornées, pas encore jugées en vol (notJudgedYet)
      const rule = k => holdRule(k, placeAt, id => objectKey(byId(d.objects, id, B.listed), resolve)),
        steps = kind === 'sequence' && Array.isArray(c.steps) && c.steps.length >= 1 && c.steps.length <= B.steps ? c.steps.map(x =>
          rule(
            plain(x) || {})) : null,
        one = HOLD_KINDS.includes(kind) ? rule(c) : null,
        later = kind === 'sequence' ? steps && !steps.includes(null) ? {
          steps
        } : null : kind === 'event' ? EVENT_ID.test(String(c.event ?? '')) ? {
          event: String(c.event)
        } : null : one && {
          rule: one
        };
      if (later) key = {
        kind: 'condition',
        condition: kind,
        ...later,
        fallbackMin
      };
      else if (kind !== 'arrival' || !at || radius === null || speed === null || escort === null || req.includes(null)) keyWhy =
        'condition';
      else key = {
        kind: 'arrival',
        point: ROUTE_END.has(idWord(c.point)) ? 'DESTINATION' : ROUTE_START.has(idWord(c.point)) ? 'ORIGIN' : byKey.get(idWord(c
          .point)).id,
        at,
        radiusNm: radius,
        speedMaxKt: speed,
        onGround: yes(c.require_on_ground, false),
        required: req, // les escales posées exigées avant l'arrivée
        escortMinSec: Math.round(escort), // le suivi d'une cible exigé (secondes) ; 0 : aucun
        fallbackMin
      };
    } else if (keys[0] === 'trigger_point') {
      const word = idWord(p.trigger_point),
        at = ROUTE_START.has(word) ? 'ORIGIN' : byKey.get(word)?.id || '',
        delay = has('trigger_delay_min') ? within(p.trigger_delay_min, 0, B.delayMin) : 0;
      if (!at) keyWhy = 'point';
      else if (delay === null) keyWhy = 'delay';
      else key = {
        kind: 'time',
        point: at,
        delayMin: Math.round(delay)
      };
    }
    // la suite de route : les points résolus (la forme des points de missionFlight), telle qu'écrite — son premier point est le raccord
    // (le point de déclenchement en V2, le dernier point de la partie d'avant dans l'atelier) ; le départ et l'arrivée n'en sont pas ;
    // un identifiant inconnu est compté
    const route = [];
    let routeUnknown = 0;
    for (const x of (Array.isArray(p.route_order) ? p.route_order : []).slice(0, B.route)) {
      const word = idWord(plain(x) ? x.id : x).split('/')[0].trim();
      if (ROUTE_START.has(word) || ROUTE_END.has(word)) continue;
      const pt = resolve(x);
      if (pt) route.push(pt);
      else routeUnknown += 1;
    }
    drawers.push({
      id,
      rank: drawers.length + 1, // le rang du tiroir, celui que l'écran dit (« Tiroir 1 »)
      title: cut(p.title, B.title),
      trigger: cut(p.trigger, B.trigger), // la clé dite en clair par l'auteur (la V2 l'imprime : « À ouvrir : … »)
      message: para(p.message, B.message),
      brief: para(p.brief, B.brief),
      key,
      keyWhy,
      condition, // le genre de trigger_condition écrit (« arrival », « hover »…), pour le dire ; '' sans condition
      emits: emitOf(p.emit_event), // le message que le tiroir envoie aux autres équipages en s'ouvrant (version 1.1), ou null
      route,
      routeUnknown
    });
  });
  return {
    drawers,
    drawersRefused: refused
  };
}

/** Une liste de textes (une chaîne, une liste, ou rien). */
const texts = v => (Array.isArray(v) ? v : v ? [v] : []).map(x => typeof x === 'string' ? clean(x) : clean(x?.text || x?.description || ''))
  .filter(Boolean);

/** Les nœuds d'un document lu que l'application accepte de réécrire (une mission de la V2 en a quelques centaines). */
export const NODES_MAX = 100000;
/** Le registre (une quarantaine de nœuds par ligne : NODES_MAX en tient deux mille) : dix fois plus (audit 187, note 3). */
export const REGISTRY_NODES_MAX = 1000000;
/** La forme d'un document lu (audits 182 et 186) : '' s'il se réécrit sans risque ; 'alias' quand un objet y paraît deux fois (une ancre
 *  YAML « &a » / « *a » : une réécriture — Y.dump, JSON.stringify — la déplierait, une bombe d'alias fige l'écriture) ; 'size' au-delà
 *  de NODES_MAX nœuds. Parcours itératif (ni récursion, ni dépliage). */
export function shapeOf(doc, max = NODES_MAX) {
  const seen = new Set(),
    stack = [doc];
  let n = 0;
  while (stack.length) {
    const v = stack.pop();
    if (++n > max) return 'size';
    if (!v || typeof v !== 'object') continue;
    if (seen.has(v)) return 'alias';
    seen.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) stack.push(x);
  }
  return '';
}

/** Le fond et la couche de la carte de la mission (SOG-0456 ; la clé `mission_map` du fichier, écrite par l'atelier) :
 *  { base: 'fast' | 'relief', airspaces: bool } — deux valeurs fermées et un booléen strict ; une clé absente, une valeur inconnue,
 *  tout autre type se lisent « fast » et faux (le fichier est une entrée non fiable : rien d'autre n'en sort). */
export function mapLook(v) {
  const m = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  return {
    base: m.base === 'relief' ? 'relief' : 'fast',
    airspaces: m.airspaces === true
  };
}

/** Une mission lue (voir l'en-tête). */
export function readMission(doc) {
  const d = doc && typeof doc === 'object' ? doc : {},
    m = d.mission || {},
    id = clean(m.id),
    type = clean(m.type);
  if (!id || !type) return null;
  const points = {},
    unread = [], // les clés de durée non reconnues, dites à la préparation (« non lue : time_window_min sur PT2 »)
    add = (p, kind) => {
      const pid = clean(p?.id);
      if (!pid || pid === '__proto__' || num(p?.lat) === null || num(p?.lon) === null) return;
      points[pid] = {
        id: pid,
        name: clean(p.name),
        lat: +p.lat,
        lon: +p.lon,
        kind,
        role: clean(p.role).slice(0, 120), // le rôle du fichier (« écopage simulé en mer ») : dit une source (SOG-0193 L3)
        ...holdOf(p, pid, unread) // le temps sur zone du point (§ 1 ter) : { hold: { min, max }, holdKey }
      };
    };
  // une liste du fichier : un tableau, un objet seul = une entrée (la forme tolérée de la fiche), toute autre valeur = rien — un
  // « zones: 7 » ou un « turning_points: { … } » faisait échouer toute la lecture (SOG-0440, le banc)
  const many = v => Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : [];
  many(d.turning_points).forEach(p => add(p, 'turn'));
  many(d.rendezvous).forEach(p => add(p, 'rdv'));
  many(d.zones).forEach(z => {
    const c = z && typeof z === 'object' ? centreOf(z) : null;
    if (c) add({
      id: z.id,
      name: z.name,
      lat: c[0],
      lon: c[1],
      role: z.role
    }, 'zone');
  });
  if (d.target && typeof d.target === 'object') add(d.target, 'target');
  // l'appareil : le bloc aircraft ; sinon (forme minimale, comme M-001) les équipes dont le type a la forme d'un indicatif OACI (« H135 »)
  let ac = (Array.isArray(d.aircraft) ? d.aircraft : d.aircraft ? [d.aircraft] : []).filter(a => a && typeof a === 'object');
  if (!ac.length) ac = (Array.isArray(d.teams) ? d.teams : []).filter(t => /^[A-Z][A-Z0-9]{1,3}$/.test(clean(t?.type).split(' ')[0])).map(
    t => ({
      type: t.type,
      callsign: t.name
    }));
  return {
    id,
    type,
    subtype: clean(m.subtype),
    theatre: typeof m.theatre === 'string' ? cut(m.theatre, 40) : '', // le théâtre : un texte nettoyé, 40 signes (SOG-0455)
    // le pays : exactement deux majuscules, sinon rien
    country: typeof m.country === 'string' && /^[A-Z]{2}$/.test(clean(m.country)) ? clean(m.country) : '',
    title: clean(d.title),
    summary: visible(d.summary).trim(),
    organisation: m.role === 'organisation' || /Z$/.test(id),
    operation: d.operation && typeof d.operation === 'object' ? {
      id: clean(d.operation.id),
      name: clean(d.operation.name)
    } : null,
    origin: placeOf(d.origin),
    destination: placeOf(d.destination),
    target: placeOf(d.target),
    points,
    holdUnread: unread, // les clés de durée non reconnues (§ 1 ter : rien ne tombe en silence)
    mapLook: mapLook(d.mission_map), // le fond et la couche de la carte de la mission, choisis par l'auteur (SOG-0456)
    routeOrder: (Array.isArray(d.route_order) ? d.route_order : []).map(x => clean(typeof x === 'object' ? x?.id : x)).filter(Boolean),
    // le cheminement du profil vertical (`vertical_profile.route`, un texte ; `route_points`, les points résolus par le studio), borné :
    // la Carte en tire ses jetons de route ; pilotView en retire ce qui nomme un lieu que la vue ne garde pas (SOG-0459)
    profileRoute: typeof plain(d.vertical_profile)?.route === 'string' ? cut(d.vertical_profile.route, PROFILE_TEXT) : '',
    profilePoints: list(plain(d.vertical_profile)?.route_points, 200).map(p => ({
      id: cut(plain(p)?.id ?? plain(p)?.name, 80),
      name: cut(plain(p)?.name, 80),
      lat: latOf(plain(p)?.lat),
      lon: lonOf(plain(p)?.lon),
      alt_ft: num(plain(p)?.alt_ft) !== null && +plain(p).alt_ft >= 0 && +plain(p).alt_ft <= 60000 ? +plain(p).alt_ft : null
    })).filter(p => p.id && p.lat !== null && p.lon !== null),
    aircraft: ac.map(a => ({
      type: clean(a.type || a.icao).split(' ')[0].toUpperCase(),
      role: clean(a.role),
      callsign: clean(a.callsign)
    })),
    cruiseLevelFt: levelFt(d.cruise_level ?? ac[0]?.cruise_level),
    cruiseSpeedKt: num(d.cruise_speed_kt ?? ac[0]?.cruise_speed_kt),
    estimate: {
      flightMin: num(d.timing?.estimated_flight_min),
      blockMin: num(d.timing?.estimated_block_min)
    },
    notes: texts(d.notes),
    constraints: texts(d.payload?.constraints),
    risks: list(d.risks, 40).map(r => typeof r === 'string' ? {
      hazard: cut(r),
      consequence: '',
      mitigation: ''
    } : {
      hazard: cut(r?.hazard ?? r?.title ?? r?.name),
      consequence: cut(r?.consequence),
      mitigation: cut(r?.mitigation)
    }).filter(r => r.hazard),
    category: categoryOf(m.category ?? d.category),
    ...sheetOf(d),
    ...drawersOf(d, points)
  };
}

// le registre est écrit par n'importe quel pilote (§ 10.36, audit de sécurité ligne 157) : un dossier ou un fichier n'est jamais pris
// tel quel ; des segments de lettres, chiffres, « _ », « - » et « . » qui ne commencent pas par un point (ni « .. », ni chemin absolu,
// ni « \ »), un fichier .yaml ou .yml ; sinon vide, et le lecteur dit « chemin refusé »
const SEGMENT = /^[\p{L}\p{N}_][\p{L}\p{N}_.-]*$/u;
/** La forme d'un identifiant de mission (« A-001A », « F-071 ») : celle des dossiers de missions/. */
const MISSION_FORM = /^[A-Z]-\d{3}[A-Z]?$/;
/** Un dossier sûr sous missions/ (« A_COMBAT/A-001A »), ou ''. */
const safeFolder = f => f && f.length <= 200 && f.split('/').every(p => SEGMENT.test(p)) ? f : '';
/** Un nom de fichier de mission sûr (« missionA-001A.yaml »), ou ''. */
const safeFile = f => f && f.length <= 120 && SEGMENT.test(f) && /\.ya?ml$/i.test(f) ? f : '';

/** Les lignes du registre (voir l'en-tête). */
/** L'identifiant de catégorie d'une mission (voir l'en-tête) : un texte de la forme des identifiants de catégorie, '' sinon (le fichier
 *  est écrit par n'importe quel pilote, audit 157 ; une catégorie inconnue de la compagnie est ignorée par le lecteur qui la cherche). */
export const categoryOf = v => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,23}$/.test(v.trim()) ? v.trim() : '';
/** La compagnie d'une mission (§ 10.38 étape 1) : le code de son champ airline (^[a-z0-9]{2,8}$, la règle des codes du cadre), ''
 *  sans champ ou pour un code d'une autre forme (une entrée non fiable : la mission est alors personnelle, ownerOf). */
export const airlineCode = v => typeof v === 'string' && /^[a-z0-9]{2,8}$/.test(v.trim()) ? v.trim() : '';
/** Le code de la compagnie « Personnel ». */
export const PERSONAL = 'perso';
/** À qui appartient une mission (l'utilisateur, 10 nov. 15 h 50 : « toutes les missions sont « ITF », alors qu'en vrai, elles sont
 *  perso ») : la compagnie que nomme son champ airline, sinon PERSONAL — jamais « la première compagnie de l'index ». */
export const ownerOf = row => airlineCode(row?.airline) || PERSONAL;
/** Les missions (lignes de readRegistry / rowOfMission) d'une compagnie : celles dont ownerOf est son code (Missions, et le compte
 *  « n missions préparées » de Réglages › Rejoindre). */
export const missionsFor = (rows, code) => (Array.isArray(rows) ? rows : []).filter(r => ownerOf(r) === code);
export function readRegistry(doc) {
  return (Array.isArray(doc?.missions) ? doc.missions : []).filter(x => x && clean(x.id)).map(x => {
    // l'identifiant est celui que disent le dossier et le fichier de la mission (« F_FIRE/F-071 » → F-071) quand le registre garde un
    // ancien numéro (« 71 », 50 missions du poste de l'utilisateur, SOG-0212) : jamais deux identifiants pour une mission ; l'ancien
    // reste dans formerId (la recherche le trouve) ; le registre n'est pas touché
    // les textes d'un fichier de data/ sont bornés à la lecture (audit 174) : le titre et l'opération à 120, l'origine et la destination
    // à 80 ; l'identifiant à 40, la longueur que registry.js compare (formerId, doubles) — l'IDENTITÉ n'est jamais raccourcie plus
    // court que ce qu'on compare, sinon le plan réécrit ou supprime des lignes (audit 176) ; l'écran la raccourcit à l'affichage seul
    const reg = clean(x.id).slice(0, 40),
      leaf = safeFolder(clean(x.folder)).split('/').pop(),
      id = MISSION_FORM.test(leaf) && leaf !== reg ? leaf : reg;
    return {
      id,
      formerId: id !== reg ? reg.slice(0, 40) : '',
      family: clean(x.family || x.type),
      title: clean(x.title).slice(0, 120),
      operation: clean(x.operation?.name).slice(0, 120),
      types: (x.aircraftTypes || x.teamTypes || []).map(clean).filter(Boolean),
      origin: clean(x.origin).slice(0, 80),
      destination: clean(x.destination).slice(0, 80),
      originIcao: icaoOf(x.origin),
      destinationIcao: icaoOf(x.destination),
      blockMin: num(x.estimate?.block),
      folder: safeFolder(clean(x.folder)),
      // le premier .yaml de la liste (le CPCO écrit souvent « summary<ID>.md » d'abord, parfois seul : 62 missions sur 153 du poste de
      // l'utilisateur se disaient « illisibles », SOG-0212), sinon le fichier nommé d'après son dossier (« F_FIRE/F-071 » →
      // missionF-071.yaml, la règle de missionPath ; un ancien identifiant « 71 » ne le nomme pas), sinon mission<ID>.yaml ; un nom
      // refusé laisse '' (« chemin refusé »)
      file: (() => {
        const list = (Array.isArray(x.files) ? x.files : []).slice(0, 20).map(clean).filter(Boolean),
          yaml = list.find(f => /\.ya?ml$/i.test(f)),
          leaf = safeFolder(clean(x.folder)).split('/').pop();
        return yaml ? safeFile(yaml) : safeFile(leaf ? `mission${leaf}.yaml` : `mission${id}.yaml`);
      })(),
      organisation: x.organisation === true || /Z$/.test(id),
      airline: airlineCode(x.airline),
      category: categoryOf(x.category),
      // ce que la recherche lit en plus (SOG-0009) : l'activité (type, sous-type : MEDEVAC, BFM…), les indicatifs, les équipes
      // (nom, service, type : SAMU66, SAMU, H135) ; des textes, bornés (le registre s'écrit par n'importe quel pilote)
      kind: clean(x.type),
      subtype: clean(x.subtype),
      callsigns: (Array.isArray(x.callsigns) ? x.callsigns : []).slice(0, 20).map(clean).filter(Boolean),
      words: (Array.isArray(x.teams) ? x.teams : []).slice(0, 20).flatMap(t => t && typeof t === 'object' ? [t.name, t.service, t
          .type
        ] : [])
        .map(clean).filter(Boolean).map(w => w.slice(0, 80))
    };
  });
}

/** Le fichier de mission d'un dossier de mission (voir l'en-tête) : « missions/<famille>/<ID>/mission<ID>.yaml », deux segments sûrs. */
export function missionPath(path) {
  const p = String(path ?? '');
  if (p.length > 320) return null;
  const m = /^missions\/([^/]+)\/([^/]+)\/mission([^/]+)\.ya?ml$/i.exec(p);
  if (!m || m[2] !== m[3]) return null;
  const folder = safeFolder(`${m[1]}/${m[2]}`),
    file = safeFile(p.slice(p.lastIndexOf('/') + 1));
  return folder && file ? {
    folder,
    file,
    id: m[2]
  } : null;
}
/** Une ligne de la liste tirée du fichier d'une mission absente du registre (voir l'en-tête) : les mêmes champs que readRegistry, des
 *  textes bornés (le fichier est écrit par n'importe quel pilote, audit 157), derived: true. */
export function rowOfMission(doc, path) {
  const where = missionPath(path),
    m = readMission(doc),
    cut = (v, n = 120) => clean(v).slice(0, n);
  if (!where || !m || m.id !== where.id) return null;
  return {
    id: cut(m.id, 40),
    family: cut(m.type, 40),
    title: cut(m.title, 200),
    operation: cut(m.operation?.name),
    types: m.aircraft.map(a => cut(a.type, 12)).filter(Boolean).slice(0, 10),
    origin: cut(m.origin?.name),
    destination: cut(m.destination?.name),
    originIcao: placeIcao(m.origin),
    destinationIcao: placeIcao(m.destination),
    blockMin: m.estimate.blockMin !== null && m.estimate.blockMin >= 0 && m.estimate.blockMin < 10000 ? m.estimate.blockMin : null,
    folder: where.folder,
    file: where.file,
    organisation: m.organisation,
    airline: airlineCode(doc?.mission?.airline ?? doc?.airline),
    category: m.category,
    kind: cut(m.type, 40),
    subtype: cut(m.subtype, 40),
    callsigns: m.aircraft.map(a => cut(a.callsign, 40)).filter(Boolean).slice(0, 20),
    words: [],
    derived: true
  };
}

/** La longueur du trajet de la mission en NM (voir l'en-tête). */
export function routeNm(mission) {
  const f = missionFlight(mission);
  if (!f) return null;
  const pts = [mission.origin, ...f.route.points, mission.destination].filter(p => latOf(p?.lat) !== null && lonOf(p?.lon) !== null);
  if (pts.length < 2) return null;
  let nm = 0;
  for (let i = 1; i < pts.length; i++) nm += legNm(pts[i - 1], pts[i]);
  return Math.round(nm);
}

/** La distance en NM entre deux lieux situés (le calcul de routeNm). */
function legNm(a, b) {
  const rad = Math.PI / 180,
    h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2;
  return 2 * 3440.065 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ce que le pilote peut voir d'une mission (voir l'en-tête ; SOG-0448, SOG-0459). La règle, écrite une fois : un lieu n'est montré
 *  que s'il est CITÉ — par la partie visible (sa route, le centre d'une de ses cartes) ou par un tiroir ouvert ; la zone d'un tiroir
 *  fermé aussi quand le fichier écrit `zone_shown: true`. Un tiroir fermé ne laisse RIEN : ni talon, ni titre, ni compte. Les
 *  identifiants se comparent comme le lecteur les lit (sans blancs, en capitales). Rien de la mission lue n'est modifié : un nouvel
 *  objet est rendu (la mission elle-même quand elle n'a ni tiroir ni partie écartée). */
export function pilotView(mission, opened = [], options = null) {
  const m = plain(mission),
    // `mine` se lit STRICTEMENT (Sécurisation, 18 nov. 2026) : sans options (absentes, null) ou sans `mine`, la mission est la mienne
    // (le défaut) ; un `mine` présent qui n'est pas exactement `true` (« false » en texte, 0, null), ou des options qui ne sont pas un
    // objet, valent « pas la mienne » — échec fermé : aucun tiroir n'est tenu pour ouvert
    mine = options === undefined || options === null ? true : plain(options) ? options.mine === undefined || options.mine === true : false;
  if (!m) return null;
  const drawers = (Array.isArray(m.drawers) ? m.drawers : []).filter(plain);
  // une mission sans tiroir n'a pas de secret ; le compte de ses parties écartées n'est pas rendu (il dirait qu'il y en avait)
  if (!drawers.length) return m.drawersRefused === 0 || m.drawersRefused === undefined ? m : {
    ...m,
    drawersRefused: 0
  };
  const open = new Set(!mine ? [] : (Array.isArray(opened) ? opened.slice(0, 64) : []).filter(x => typeof x === 'string' &&
      DRAWER_IDS.includes(x))),
    cited = new Set(),
    cite = v => {
      const w = idWord(plain(v) ? v.id : v);
      if (w) cited.add(w);
    };
  (Array.isArray(m.routeOrder) ? m.routeOrder : []).slice(0, 400).forEach(cite);
  (Array.isArray(m.maps) ? m.maps : []).slice(0, 40).forEach(x => cite(plain(x)?.centreRef));
  for (const d of drawers) {
    const k = plain(d.key) || {};
    if (open.has(d.id)) {
      cite(k.zoneId);
      cite(k.point);
      (Array.isArray(k.required) ? k.required : []).slice(0, DRAWER_BOUNDS.required).forEach(cite);
      (Array.isArray(d.route) ? d.route : []).slice(0, DRAWER_BOUNDS.route).forEach(cite);
    } else if (k.kind === 'zone' && k.shown === true) cite(k.zoneId); // montrée par le fichier : une zone ordinaire
  }
  const all = plain(m.points) || {},
    seen = id => cited.has(idWord(id)),
    targetId = Object.keys(all).find(id => plain(all[id])?.kind === 'target'),
    targetSeen = cited.has('TARGET') || (targetId !== undefined && seen(targetId)),
    points = {},
    keep = list => (Array.isArray(list) ? list : []).filter(x => plain(x) && x.id && seen(x.id));
  for (const id of Object.keys(all))
    if (id !== '__proto__' && (plain(all[id])?.kind === 'target' ? targetSeen : seen(id))) points[id] = all[id];
  // le cheminement du profil : un jeton qui nomme un lieu de la mission que la vue ne garde pas (son identifiant, son nom, ou l'identifiant
  // d'un lieu que seul un tiroir cite) n'y est plus ; les autres jetons (un niveau, un mot clé, ORIGIN…) restent
  const lost = new Set(), // les identifiants et les noms (en capitales, blancs réduits) des lieux que la vue ne garde pas
    keptNames = new Set(), // les noms des lieux gardés (un nom caché ne les mange pas)
    lose = v => {
      const w = idWord(v);
      if (w && !cited.has(w)) lost.add(w);
    },
    place = (id, name, isKept) => {
      const i = idWord(id),
        n = idWord(name);
      if (isKept) {
        if (n) keptNames.add(n);
      } else {
        if (i) lost.add(i);
        if (n) lost.add(n);
      }
    };
  for (const id of Object.keys(all)) place(id, plain(all[id])?.name, plain(all[id])?.kind === 'target' ? targetSeen : seen(id));
  for (const x of [...(Array.isArray(m.zones) ? m.zones : []), ...(Array.isArray(m.rendezvous) ? m.rendezvous : []),
      ...(Array.isArray(m.turns) ? m.turns : [])
    ].slice(0, 200)) place(plain(x)?.id, plain(x)?.name, seen(plain(x)?.id));
  for (const d of drawers) {
    const k = plain(d.key) || {};
    lose(k.zoneId);
    lose(k.point);
    (Array.isArray(k.required) ? k.required : []).slice(0, DRAWER_BOUNDS.required).forEach(lose);
    (Array.isArray(d.route) ? d.route : []).slice(0, DRAWER_BOUNDS.route).forEach(p => lose(plain(p) ? p.id : p));
  }
  ['ORIGIN', 'DESTINATION'].forEach(w => lost.delete(w)); // le départ et l'arrivée ne sont pas des lieux cachés
  for (const w of keptNames) lost.delete(w); // le nom d'un lieu gardé ne part jamais
  const named = t => ![t, t.split('/')[0]].some(w => lost.has(idWord(w))),
    // les noms de PLUSIEURS mots (« Port Alpha »), gardés ou non : le texte est coupé aux blancs, ils sont donc cherchés AVANT, mot à mot,
    // les plus longs d'abord, bornés (200 noms, 8 mots) ; un nom ne se reconnaît qu'entre blancs, virgule, point-virgule ou bords du texte
    multi = (set, keptFlag) => [...set].filter(n => n.includes(' ') && n.length <= 80).slice(0, 200).map(n => ({
      words: n.split(' ').slice(0, 8),
      keptFlag
    })),
    names = [...multi(lost, false), ...multi(keptNames, true)].sort((x, y) => y.words.length - x.words.length || (x.keptFlag ? -1 : 1)),
    text = (typeof m.profileRoute === 'string' ? m.profileRoute : '').slice(0, PROFILE_TEXT),
    toks = [...text.matchAll(/[^\s,;]+/g)].slice(0, 300).map(x => ({
      t: x[0],
      at: x.index
    })),
    kept = [];
  for (let i = 0; i < toks.length;) {
    const hit = names.find(n => n.words.every((w, j) => {
      const k = toks[i + j];
      if (!k) return false;
      const u = k.t.toUpperCase(),
        last = j === n.words.length - 1;
      return (last ? u.split('/')[0] : u) === w && (j === 0 || /^\s+$/.test(text.slice(toks[i + j - 1].at + toks[i + j - 1].t.length,
        k.at)));
    }));
    if (hit) {
      if (hit.keptFlag)
        for (let j = 0; j < hit.words.length; j++) kept.push(toks[i + j].t);
      i += hit.words.length;
    } else {
      if (named(toks[i].t)) kept.push(toks[i].t);
      i += 1;
    }
  }
  const profileRoute = kept.join(' '),
    profilePoints = (Array.isArray(m.profilePoints) ? m.profilePoints : []).slice(0, 200).filter(p => plain(p) && named(String(p.id ??
        '')) &&
      named(String(p.name ?? '')));
  const zones = keep(m.zones),
    rendezvous = keep(m.rendezvous),
    turns = keep(m.turns),
    target = targetSeen ? m.target : null,
    at = p => plain(p) && p.lat !== null && p.lat !== undefined && p.lon !== null && p.lon !== undefined;
  return {
    ...m,
    target,
    points,
    zones,
    rendezvous,
    turns,
    drawers: drawers.filter(d => open.has(d.id)), // les ouverts seuls, entiers ; un fermé ne laisse rien (SOG-0459)
    drawersRefused: 0,
    profileRoute,
    profilePoints,
    hasCoords: [m.origin, m.destination, target, ...turns, ...rendezvous, ...zones].some(at),
    pilot: {
      mine,
      opened: DRAWER_IDS.filter(x => open.has(x))
    }
  };
}

/** La distance et le temps estimé du départ au passage d'un point de la partie A (voir l'en-tête ; la clé « heure » d'un tiroir, que la
 *  V2 estime sur la route prévue). La distance : celle de routeNm, de l'origine (si elle est située) au point ; les minutes : la distance
 *  à la vitesse de croisière, plus le temps sur zone des points d'AVANT (le milieu d'une fourchette) ; min null sans vitesse. */
export function passageMin(mission, pointId) {
  const f = missionFlight(mission);
  if (!f) return null;
  const word = clean(pointId).toUpperCase();
  if (ROUTE_START.has(word)) return {
    nm: 0,
    min: 0
  };
  const at = f.route.points.findIndex(p => String(p.id).toUpperCase() === word);
  if (!word || at < 0) return null;
  const pts = [mission.origin, ...f.route.points.slice(0, at + 1)].filter(p => latOf(p?.lat) !== null && lonOf(p?.lon) !== null),
    kt = num(mission.cruiseSpeedKt);
  let nm = 0,
    held = 0;
  for (let i = 1; i < pts.length; i++) nm += legNm(pts[i - 1], pts[i]);
  for (const p of f.route.points.slice(0, at))
    if (p.hold) held += (p.hold.min + p.hold.max) / 2;
  return {
    nm: Math.round(nm),
    min: kt !== null && kt > 0 ? Math.round(nm / kt * 60 + held) : null
  };
}

// ---------------------------------------------------------------- le temps sur zone d'un point (CONCEPTION 11/11 § 1 bis, § 1 ter)
// L'utilisateur : « (fourchette. entre 5 et 40 mn, par ex.) » ; « comme le reste, les champs ne sont pas canoniques ». Une clé du point est
// reconnue si son nom contient on_task, on_station, on_zone, hold, loiter ou orbit (préfixe time_ / duration_ et unité _min, _s, _h
// permis) ; un time… ou un duration… nu n'est pas pris. Valeur : un nombre, « 5-40 », « 5 à 40 », [5, 40] ou { min, max }, en minutes
// de 0 à 600 ; 0 = pas de temps sur zone. La première clé reconnue gagne (les autres sont dites).
const HOLD_KEY = /(on_task|on_station|on_zone|hold|loiter|orbit)/i,
  DURATION_KEY = /(^|_)(time|duration|min|minutes)(_|$)/i,
  HOLD_MAX = 600;
/** Une durée en minutes d'une valeur et de l'unité de sa clé ; null sinon. */
const minutesOf = (v, key) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*\d+([.,]\d+)?\s*$/.test(v) ? +v.replace(',', '.') : NaN;
  if (!Number.isFinite(n) || n < 0) return null;
  const k = String(key).toLowerCase(),
    m = /_s$|_sec(onds?)?$/.test(k) ? n / 60 : /_h$|_hours?$/.test(k) ? n * 60 : n;
  return m <= HOLD_MAX ? Math.round(m) : null;
};
/** { min, max } d'une valeur (nombre, texte « 5-40 » / « 5 à 40 », liste, objet) ; null sans durée lisible ou à 0. */
function holdRange(v, key) {
  let a = null,
    b = null;
  if (Array.isArray(v) && v.length === 2)[a, b] = v.map(x => minutesOf(x, key));
  else if (v && typeof v === 'object')[a, b] = [minutesOf(v.min, key), minutesOf(v.max, key)];
  else if (typeof v === 'string' && /\d\s*(-|–|—|à|to|bis|a)\s*\d/i.test(v)) {
    const m = /^\s*(\d+(?:[.,]\d+)?)\s*(?:-|–|—|à|to|bis|a)\s*(\d+(?:[.,]\d+)?)\s*$/i.exec(v);
    if (m)[a, b] = [minutesOf(m[1], key), minutesOf(m[2], key)];
  } else a = b = minutesOf(v, key);
  if (a === null && b !== null) a = b;
  if (b === null && a !== null) b = a;
  if (a === null || b === null) return null;
  if (a > b)[a, b] = [b, a];
  return b > 0 ? {
    min: a,
    max: b
  } : null;
}
/** Le temps sur zone d'un point du fichier : { hold, holdKey } ou {} ; les clés de durée non reconnues (ou en trop) vont dans `unread`
 *  (« time_window_min sur PT2 »). */
function holdOf(p, pid, unread) {
  if (!p || typeof p !== 'object') return {};
  let out = {};
  for (const [k, v] of Object.entries(p).slice(0, 60)) {
    const key = String(k);
    if (HOLD_KEY.test(key)) {
      const r = holdRange(v, key);
      if (r && !out.hold) out = {
        hold: r,
        holdKey: key.slice(0, 40)
      };
      else if (r && out.hold && unread.length < 20) unread.push(`${key.slice(0, 40)} · ${pid}`);
    } else if (DURATION_KEY.test(key) && holdRange(v, key) && unread.length < 20) unread.push(`${key.slice(0, 40)} · ${pid}`);
  }
  return out;
}

/** Un point que la mission impose (§ 10.47 c ; l'utilisateur : « les points de rdv, source, cible, restent imposés sur la carte ») :
 *  un rendez-vous, la cible, et un point ou une zone dont le rôle dit une source (« écopage simulé en mer », « source d'eau ») ; les
 *  tournants de transit restent ceux du pilote. */
export function lockedPoint(p) {
  return !!p && (p.kind === 'rdv' || p.kind === 'target' || (p.kind === 'turn' || p.kind === 'zone') && SOURCE_ROLE.test(String(p.role ||
    '')));
}
const SOURCE_ROLE = /(^|[^a-zà-ÿ])(source|sources|[ée]copage|[ée]coper|scoop|scooping|plan d'eau|pélicandage|pelicandage)([^a-zà-ÿ]|$)/i;

/** Un point de la mission comme le vol le porte (missionFlight, la suite de route d'un tiroir) : { id, lat, lon, name, lock, hold,
 *  holdKey }. */
function flightPoint(p) {
  return {
    id: p.id,
    lat: p.lat,
    lon: p.lon,
    name: p.name,
    // SOG-0193 L3 (§ 10.47 c) : un point que la mission impose — rendez-vous, cible, source — est verrouillé dans le vol
    ...(lockedPoint(p) ? {
      lock: 'mission'
    } : {}),
    ...(p.hold ? { // le temps sur zone du point (§ 1 bis) : une durée ou une fourchette, en minutes
      hold: {
        ...p.hold
      },
      holdKey: p.holdKey
    } : {})
  };
}

/** Le vol qu'une mission donne à Carburant (voir l'en-tête). */
export function missionFlight(mission, assignment = null) {
  if (!mission) return null;
  const a = assignment || {},
    dep = mission.origin?.icao || clean(a.departure).toUpperCase() || '',
    arr = mission.destination?.icao || mission.origin?.icao || '',
    order = mission.routeOrder.length ? mission.routeOrder : Object.keys(mission.points),
    // un identifiant du fichier n'est lu que s'il est une clé propre des points (« constructor » n'est pas un point)
    points = order.map(id => Object.hasOwn(mission.points, id) ? mission.points[id] : null).filter(Boolean).map(flightPoint);
  // SOG-0193 : la position de l'origine et de la destination (celle de l'origine pour un aller-retour), pour qu'un terrain que la base
  // ne connaît pas (une base d'opérations, un terrain non publié) reste dans le plan et dans sa distance
  const at = p => p && latOf(p.lat) !== null && lonOf(p.lon) !== null ? {
      lat: latOf(p.lat),
      lon: lonOf(p.lon)
    } : null,
    depAt = mission.origin?.icao === dep || !mission.origin?.icao ? at(mission.origin) : null,
    arrAt = mission.destination ? at(mission.destination) : at(mission.origin);
  return {
    route: {
      dep,
      arr,
      points,
      depAt,
      arrAt
    },
    aircraft: {
      type: mission.aircraft[0]?.type || clean(a.aircraft?.type).toUpperCase() || '',
      registration: clean(a.aircraft?.registration).toUpperCase()
    },
    levelFt: mission.cruiseLevelFt,
    speedKt: mission.cruiseSpeedKt,
    mission: mission.id,
    category: mission.category || '',
    holdUnread: Array.isArray(mission.holdUnread) ? mission.holdUnread.slice(0, 20) : []
  };
}
