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
//   placesOf(doc) → [{ kind: dep|arr|target|zone|pt|rdv, i, id, name, role, lat, lon, (zone) zkind, radius, tot, poly, (rdv)
//     participants }] : les nombres en texte, pour les champs ; withPlaces(doc, rows) → un NOUVEAU document : la cible, les zones, les
//     points tournants et les rendez-vous réécrits depuis les lignes (chaque lieu gardé garde ses autres clés, un polygone ses points),
//     la position seule du départ et de l'arrivée ; une coordonnée vide ou hors bornes s'écrit null (« à placer », la forme de la V2).
//   storyOf(doc) → { summary, description, primary, secondary (une ligne par objectif), payload, mass, pax } ; withStory(doc, story) →
//     un NOUVEAU document : summary, detailed_description, objectives.{ primary, secondary }, payload.{ description, mass_kg,
//     passengers } (les autres clés de objectives et de payload gardées) ; SUMMARY_MAX : la longueur conseillée du résumé (600, la
//     coupe de la synthèse, SOG-0291) — un résumé plus long n'est jamais coupé à l'écriture.
//   THEATRES : les théâtres de la V2 (apps/cpco/mission_skeleton.js).
//   cadreOf(doc) → { family, subtype, series, id, title, theatre, dep, arr } (textes) ; placeText(p) : « XTST · Base Test ».
//   withCadre(doc, cadre) → un NOUVEAU document : mission.{ id, type, subtype, series, number, theatre }, title, origin, destination ;
//     un terrain dont le code OACI ne change pas garde sa position, sinon elle tombe (à placer dans Lieux).
//   blank() → le document d'une mission neuve (schéma de la V2, helo-xp-mission 2.0), vide.
//   duplicate(doc) → une copie : l'opération et l'historique retirés, le reste gardé (l'identifiant se change ensuite par withCadre).
//   numbering(rows, family, letter) → { id, series, nextSeries } : l'identifiant suivant de la famille (« T-086 »), sa série en cours.
//   pathFor(letter, family, id) → 'missions/<lettre>_<FAMILLE>/<ID>/mission<ID>.yaml' ; '' si l'un n'a pas sa forme.
//   blocking(cadre, { rows, letter, own }) → [clé] : ce qui empêche d'enregistrer (famille, format de l'identifiant, lettre de la
//     famille, identifiant déjà pris par une autre ligne) ; le reste n'est jamais bloquant.
//   todo(doc) → [{ step, key }] : « À compléter » (jamais bloquant).
//   stepState(doc, step) → 'ok' | 'todo'.
//   regAdd(regDoc, entry) → { doc } | { error: 'taken' } ; regEdit(regDoc, idx, regId, cadre, path, now) → { doc } | { error: 'stale' }.
//   yamlText(doc, Y, now) : le texte du fichier (en-tête daté, puis le document).
import * as MS from '../../frame/lib/mission.js';

export const STEPS = ['cadre', 'teams', 'places', 'story', 'risks', 'timeline'];
export const OPEN = ['cadre', 'teams', 'places', 'story'];
/** Le résumé conseillé (la synthèse le montre entier jusque-là, SOG-0291) ; une description, au plus. */
export const SUMMARY_MAX = 600,
  TEXT_MAX = 20000;
/** Les lieux d'une sorte, au plus (la borne du lecteur pour les points). */
export const PLACES_MAX = 60;
/** Les équipes d'une mission, au plus (la borne du lecteur, frame/lib/mission.js). */
export const TEAMS_MAX = 40;
export const THEATRES = ['métropole', 'Corse', 'Antilles', 'Guyane', 'Réunion', 'Mayotte', 'Nouvelle-Calédonie', 'Polynésie'];
/** L'identifiant d'une mission (la forme de add.js) et une famille (mission.type). */
const MISSION_ID = /^[A-Z]-\d{3}[A-Z]?$/,
  FAMILY = /^[A-Z][A-Z0-9_]{1,23}$/;

/** Un texte nettoyé et borné. */
const cut = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
/** Un objet du document, ou {}. */
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};

/** Le texte d'un terrain : « XTST · Base Test » (le code OACI d'abord), le nom seul sans code. */
export function placeText(p) {
  const o = obj(p),
    icao = /^[A-Z]{4}$/.test(String(o.icao || '')) ? o.icao : MS.icaoOf(o.name),
    name = cut(String(o.name || '').replace(/\s*\([A-Z]{4}\)\s*$/, ''), 120);
  return [icao, name].filter(Boolean).join(' · ');
}
/** Un terrain saisi (« XTST · Base Test », « Base Test (XTST) », « XTST ») → { icao, name } ; le nom écrit « Base Test (XTST) ». */
function placeIn(text) {
  const t = cut(text, 160),
    a = /^([A-Z]{4})(?:\s*[·\-–—:]\s*(.*))?$/.exec(t),
    icao = a ? a[1] : MS.icaoOf(t),
    bare = a ? cut(a[2], 120) : cut(t.replace(/\s*\([A-Z]{4}\)\s*$/, ''), 120);
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
    arr: placeText(obj(doc).destination)
  };
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
    m = out.mission = {
      ...obj(out.mission)
    },
    series = /^\d{1,5}$/.test(String(c.series ?? '').trim()) ? +String(c.series).trim() : null,
    num = /^[A-Z]-(\d{3})/.exec(cut(c.id, 40));
  m.id = cut(c.id, 40).toUpperCase();
  m.type = cut(c.family, 24).toUpperCase();
  if (cut(c.subtype, 40)) m.subtype = cut(c.subtype, 40);
  else delete m.subtype;
  if (series !== null) m.series = series;
  else delete m.series;
  if (num) m.number = +num[1];
  if (cut(c.theatre, 40)) m.theatre = cut(c.theatre, 40);
  else delete m.theatre;
  out.title = cut(c.title, 200);
  for (const [k, v] of [
      ['origin', c.dep],
      ['destination', c.arr]
    ]) {
    const p = placeWith(out[k], v);
    if (p) out[k] = p;
    else delete out[k];
  }
  return out;
}

/** Les équipes d'une mission (voir l'en-tête). */
export function teamsOf(doc) {
  return (Array.isArray(obj(doc).teams) ? obj(doc).teams : []).slice(0, TEAMS_MAX).map((t, i) => ({
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
    before = Array.isArray(out.teams) ? out.teams : [],
    teams = (Array.isArray(rows) ? rows : []).slice(0, TEAMS_MAX).map(r => {
      const t = {
        ...(Number.isInteger(r?.i) && r.i >= 0 ? obj(before[r.i]) : {}),
        name: cut(r?.name, 80),
        service: cut(r?.service, 120),
        type: cut(r?.type, 60).toUpperCase(),
        role: cut(r?.role, 200)
      };
      for (const k of ['service', 'type', 'role'])
        if (!t[k]) delete t[k];
      return t;
    }).filter(t => t.name || t.service || t.type || t.role);
  if (teams.length) out.teams = teams;
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
/** Un nombre lu du fichier, en texte pour un champ ('' sinon). */
const numText = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? '' : String(+v);

/** Les lieux d'une mission (voir l'en-tête). */
export function placesOf(doc) {
  const d = obj(doc),
    arr = v => (Array.isArray(v) ? v : []).slice(0, PLACES_MAX),
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
      radius: numText(o.radius_km),
      tot: numText(o.time_on_task_min),
      poly: poly ? poly.length : 0
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
    participants: (Array.isArray(obj(p).participants) ? obj(p).participants : []).slice(0, 20).map(x => cut(x, 60)).filter(Boolean)
      .join(', ')
  }));
  return out;
}

/** Le document avec ses lieux retouchés (voir l'en-tête). */
export function withPlaces(doc, rows) {
  const out = structuredClone(obj(doc)),
    list = Array.isArray(rows) ? rows : [],
    before = k => Array.isArray(out[k]) ? out[k] : [],
    base = (k, r) => Number.isInteger(r.i) && r.i >= 0 ? obj(before(k)[r.i]) : {},
    common = r => ({
      id: cut(r.id, 40),
      name: cut(r.name, 120),
      role: cut(r.role, 200)
    }),
    trim = o => {
      for (const k of ['id', 'name', 'role'])
        if (!o[k]) delete o[k];
      return o;
    },
    at = (o, r) => {
      const lat = coord(r.lat, 90),
        lon = coord(r.lon, 180);
      o.lat = lat;
      o.lon = lon;
      return o;
    };
  // le départ et l'arrivée : leur position seule (le nom se change au Cadre)
  for (const [kind, key] of [
      ['dep', 'origin'],
      ['arr', 'destination']
    ]) {
    const r = list.find(x => x.kind === kind);
    if (r && out[key] && typeof out[key] === 'object') out[key] = at({
      ...out[key]
    }, r);
  }
  const t = list.find(x => x.kind === 'target');
  if (t) out.target = trim(at({
    ...obj(out.target),
    ...common(t)
  }, t));
  else delete out.target;
  const zones = list.filter(x => x.kind === 'zone').slice(0, PLACES_MAX).map(r => {
      const b = base('zones', r),
        z = trim({
          ...b,
          ...common(r)
        }),
        lat = coord(r.lat, 90),
        lon = coord(r.lon, 180),
        radius = positive(r.radius, 500),
        tot = positive(r.tot, 9999);
      if (cut(r.zkind, 40)) z.kind = cut(r.zkind, 40);
      else delete z.kind;
      // le centre : là où le fichier le portait (centre: { lat, lon }, ou lat / lon à plat) ; un polygone garde ses points
      if (b.lat !== undefined && !b.centre) Object.assign(z, {
        lat,
        lon
      });
      else if (lat !== null || lon !== null || b.centre) z.centre = {
        ...obj(b.centre),
        lat,
        lon
      };
      if (radius !== null) z.radius_km = radius;
      else delete z.radius_km;
      if (tot !== null) z.time_on_task_min = tot;
      else delete z.time_on_task_min;
      return z;
    }),
    pts = list.filter(x => x.kind === 'pt').slice(0, PLACES_MAX).map(r => trim(at({
      ...base('turning_points', r),
      ...common(r)
    }, r))),
    rdv = list.filter(x => x.kind === 'rdv').slice(0, PLACES_MAX).map(r => trim(at({
      ...base('rendezvous', r),
      ...common(r),
      participants: String(r.participants ?? '').split(',').map(x => cut(x, 60)).filter(Boolean).slice(0, 20)
    }, r)));
  for (const [k, v] of [
      ['zones', zones],
      ['turning_points', pts],
      ['rendezvous', rdv]
    ])
    if (v.length) out[k] = v;
    else delete out[k];
  return out;
}

/** Un texte de plusieurs lignes, borné, ses fins de ligne ramenées à « \n ». */
const para = (v, n) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim().slice(0, n);

/** Le récit d'une mission (voir l'en-tête). */
export function storyOf(doc) {
  const d = obj(doc),
    o = d.objectives,
    pl = obj(d.payload);
  return {
    summary: para(d.summary, SUMMARY_MAX * 4),
    description: para(d.detailed_description, TEXT_MAX),
    primary: Array.isArray(o) ? '' : para(obj(o).primary, 2000),
    secondary: (Array.isArray(o) ? o : Array.isArray(obj(o).secondary) ? obj(o).secondary : []).slice(0, 20).map(x => cut(x, 300)).filter(
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
    o = out.objectives,
    objectives = Array.isArray(o) ? {} : {
      ...obj(o)
    },
    payload = {
      ...obj(out.payload)
    },
    mass = positive(t.mass, 999999),
    pax = positive(t.pax, 9999);
  out.summary = para(t.summary, SUMMARY_MAX * 4);
  out.detailed_description = para(t.description, TEXT_MAX);
  objectives.primary = para(t.primary, 2000);
  objectives.secondary = String(t.secondary ?? '').split('\n').map(x => cut(x, 300)).filter(Boolean).slice(0, 20);
  if (!objectives.primary) delete objectives.primary;
  if (!objectives.secondary.length) delete objectives.secondary;
  if (Object.keys(objectives).length) out.objectives = objectives;
  else delete out.objectives;
  payload.description = para(t.payload, 2000);
  if (!payload.description) delete payload.description;
  if (mass !== null) payload.mass_kg = mass;
  else delete payload.mass_kg;
  if (pax !== null && Number.isInteger(pax)) payload.passengers = pax;
  else delete payload.passengers;
  if (Object.keys(payload).length) out.payload = payload;
  else delete out.payload;
  return out;
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

/** « À compléter » (voir l'en-tête) : les champs vides de chaque étape, jamais bloquants. */
export function todo(doc) {
  const d = obj(doc),
    m = obj(d.mission),
    arr = v => Array.isArray(v) ? v : [],
    out = [],
    add = (step, key) => out.push({
      step,
      key
    });
  if (!cut(d.title, 200)) add('cadre', 'title');
  if (!cut(m.theatre, 40)) add('cadre', 'theatre');
  if (!placeText(d.origin)) add('cadre', 'dep');
  if (!placeText(d.destination)) add('cadre', 'arr');
  if (!arr(d.teams).length && !arr(d.aircraft).length) add('teams', 'teams');
  for (const k of ['origin', 'destination']) {
    const p = obj(d[k]);
    if (placeText(p) && (!Number.isFinite(+p.lat) || !Number.isFinite(+p.lon) || p.lat === null || p.lon === null)) add('places', k);
  }
  // les lieux sans position (un polygone se place par ses points) : un seul mot pour tous
  if (placesOf(d).some(p => !['dep', 'arr'].includes(p.kind) && !p.poly && (p.lat === '' || p.lon === ''))) add('places', 'unplaced');
  if (!String(d.summary ?? '').trim()) add('story', 'summary');
  if (!String(d.detailed_description ?? '').trim()) add('story', 'description');
  if (!arr(d.risks).length) add('risks', 'risks');
  if (!arr(d.timeline).length && !arr(d.chronology).length) add('timeline', 'timeline');
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

/** Le texte du fichier (voir l'en-tête). */
export function yamlText(doc, Y, now = new Date().toISOString()) {
  return `# Mission — écrite par l'éditeur de la V3 (modules/missions, Compagnie › Registre)\n# ${now}\n${Y.dump(doc, {
    lineWidth: -1,
    noRefs: true
  })}`;
}
