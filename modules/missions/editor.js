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
//   risksOf(doc) → [{ i, hazard, consequence, mitigation }] ; withRisks(doc, rows) → un NOUVEAU document : la forme du prompt de la V2
//     (hazard, consequence, mitigation ; pas de niveau, la V2 n'en lit pas) ; un risque sans danger est retiré ; un risque retiré l'est
//     aussi de i18n.<langue>.risks (« même ordre que risks ») ; RISKS_MAX lignes.
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
//   shapeOf(doc) → '' | 'alias' | 'size' : refusé à l'ouverture quand il ne se réécrit pas sans risque ; same(a, b) : rien n'a changé.
//   Règle des with… (audit 182, Sécurisation) : seul ce que le pilote a changé est écrit ; « Enregistrer » sans rien toucher n'écrit rien.
import * as MS from '../../frame/lib/mission.js';

export const STEPS = ['cadre', 'teams', 'places', 'story', 'risks', 'timeline'];
export const OPEN = ['cadre', 'teams', 'places', 'story', 'risks'];
/** Les risques d'une mission, au plus (la borne du lecteur). */
export const RISKS_MAX = 40;
/** Le résumé conseillé (la synthèse le montre entier jusque-là, SOG-0291) ; une description, au plus. */
export const SUMMARY_MAX = 600,
  TEXT_MAX = 20000;
/** Les lieux d'une sorte, au plus (la borne du lecteur pour les points). */
export const PLACES_MAX = 60;
/** Les équipes d'une mission, au plus (la borne du lecteur, frame/lib/mission.js). */
export const TEAMS_MAX = 40;
/** Les nœuds d'un fichier de mission que l'éditeur accepte de réécrire (une mission de la V2 en a quelques centaines). */
export const NODES_MAX = 100000;
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
    prev = cadreOf(doc),
    // audit 182 : seul ce que le pilote a changé est écrit — un champ inchangé garde la valeur du fichier telle quelle (jamais recoupée)
    changed = k => String(c[k] ?? '') !== String(prev[k] ?? '');
  if (!['id', 'family', 'subtype', 'series', 'theatre', 'title', 'dep', 'arr'].some(changed)) return out;
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
    prev = teamsOf(doc),
    list = Array.isArray(rows) ? rows : [];
  // audit 182 : rien de changé, rien de réécrit ; sinon une équipe inchangée reste l'objet du fichier, une équipe retouchée ne prend
  // que ses champs changés, les équipes au-delà de TEAMS_MAX (non montrées) restent telles quelles à la fin
  if (JSON.stringify(list) === JSON.stringify(prev)) return out;
  const before = Array.isArray(out.teams) ? out.teams : [],
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
    const before = Array.isArray(out[key]) ? out[key] : [],
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
  rebuild('zone', 'zones', ['id', 'name', 'role', 'zkind', 'lat', 'lon', 'radius', 'tot'], (z, r, diff, b) => {
    if (diff.includes('zkind')) text(z, 'kind', r.zkind, 40);
    if (diff.includes('lat') || diff.includes('lon')) {
      const lat = coord(r.lat, 90),
        lon = coord(r.lon, 180);
      // le centre : là où le fichier le portait (centre: { lat, lon }, ou lat / lon à plat) ; un polygone garde ses points
      if (b.lat !== undefined && !b.centre) Object.assign(z, {
        lat,
        lon
      });
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
  return (Array.isArray(obj(doc).risks) ? obj(doc).risks : []).slice(0, RISKS_MAX).map((r, i) => typeof r === 'string' ? {
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
  const before = Array.isArray(out.risks) ? out.risks : [],
    F = ['hazard', 'consequence', 'mitigation'],
    put = (o, f, v) => {
      const x = cut(v, 300);
      if (x) o[f] = x;
      else delete o[f];
    },
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
        return o.hazard ? o : null;
      }
      const o = {};
      for (const f of F) put(o, f, r?.[f]);
      return o.hazard ? o : null;
    }).filter(o => o !== null),
    all = [...risks, ...before.slice(RISKS_MAX)];
  if (all.length) out.risks = all;
  else delete out.risks;
  // les traductions suivent « même ordre que risks » (le prompt de la V2) : un risque retiré l'est aussi de chaque langue
  const gone = prev.filter(p => !kept.has(p.i)).map(p => p.i).sort((a, b) => b - a);
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

/** La forme d'un document lu (audit 182) : '' s'il se réécrit sans risque ; 'alias' quand un objet y paraît deux fois (une ancre
 *  YAML « &a » / « *a » : la réécriture la déplierait, une bombe d'alias figerait l'enregistrement) ; 'size' au-delà de NODES_MAX nœuds. */
export function shapeOf(doc) {
  const seen = new Set(),
    stack = [doc];
  let n = 0;
  while (stack.length) {
    const v = stack.pop();
    if (++n > NODES_MAX) return 'size';
    if (!v || typeof v !== 'object') continue;
    if (seen.has(v)) return 'alias';
    seen.add(v);
    for (const x of Array.isArray(v) ? v : Object.values(v)) stack.push(x);
  }
  return '';
}

/** Vrai quand le document n'a pas changé (audit 182 : « Enregistrer » sans rien toucher n'écrit rien, le fichier reste identique). */
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Le texte du fichier (voir l'en-tête). */
export function yamlText(doc, Y, now = new Date().toISOString()) {
  return `# Mission — écrite par l'éditeur de la V3 (modules/missions, Compagnie › Registre)\n# ${now}\n${Y.dump(doc, {
    lineWidth: -1,
    noRefs: true
  })}`;
}
