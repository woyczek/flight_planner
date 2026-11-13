// V3 missions — l'éditeur de missions (SOG-0287, maquette validée le 13 nov. 2026 : modules/missions/maquette/), le calcul pur. Ni
// page, ni stockage, ni réseau : le document de la mission (déjà lu par js-yaml, schéma CORE : les dates restent des textes), les lignes
// du registre (frame/lib/mission.js readRegistry), le document du registre. Le fichier lu est une entrée non fiable (audit 157) : seuls
// les champs de l'étape éditée sont retouchés, bornés ; tout le reste du document est gardé tel quel.
//
// API :
//   STEPS : les six étapes de la maquette (Cadre, Équipes, Lieux, Récit, Risques, Chronologie et cartes) ; seule « cadre » s'édite
//     dans ce lot (les autres suivent, une par push).
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
