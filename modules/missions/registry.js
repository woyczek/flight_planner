// V3 missions — l'écran « Registre des missions » (SOG-0021 / Q-0021, CONCEPTION § 2 bis) : le calcul pur. Ni page, ni stockage, ni
// réseau : le document du registre (missions/mission_registry.yaml, déjà lu par js-yaml), les chemins du dépôt, les missions lues.
// Le registre est écrit par n'importe quel pilote (audit 157) : tout ce qui en est lu passe par frame/lib/mission.js (readRegistry,
// missionPath : dossier et fichier sûrs) ; les textes sont bornés ; le document est retouché là où l'on agit, tout le reste est gardé.
//
//   entries(doc) → [{ idx, raw, row }] : une entrée par ligne du registre (idx : sa place dans doc.missions ; row : readRegistry).
//   pathOf(row) → 'missions/<dossier>/<fichier>' ou '' (chemin refusé).
//   entryOfMission(docMission, path) → l'entrée de registre d'une mission du dépôt (celle que « Mettre à jour » ajoute), null sinon.
//   planOf(doc, status, found) → { add, noFile, dup, former } : ce que « Mettre à jour le registre » ferait.
//   applyPlan(doc, plan, now) → un nouveau document (l'ancien n'est pas touché).
//   editEntry(doc, idx, id, fields, now) → { doc } | { error: 'stale'|'series'|'number' } : corriger titre, série, numéro, opération.
//   removeEntry(doc, idx, id, now) → { doc } | { error: 'stale' } : retirer la ligne ; le fichier de la mission reste.
//   withHeader(text) : le texte YAML du registre (commentaire d'en-tête, puis le document).
import * as MS from '../../frame/lib/mission.js';

/** Un texte nettoyé et borné. */
const cut = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Les lignes du registre avec leur place (voir l'en-tête). */
export function entries(doc) {
  const list = Array.isArray(doc?.missions) ? doc.missions : [];
  const out = [];
  list.forEach((raw, idx) => {
    const row = raw && typeof raw === 'object' ? MS.readRegistry({
      missions: [raw]
    })[0] : null;
    if (row) out.push({
      idx,
      raw,
      row
    });
  });
  return out;
}

/** Le chemin du fichier de mission d'une ligne ('' quand le registre en donne un qui n'est pas sûr). */
export const pathOf = row => row?.folder && row?.file ? `missions/${row.folder}/${row.file}` : '';

/** Le numéro de mission d'un identifiant (« A-001A » → 1), null sinon. */
const numberOf = id => {
  const m = /^[A-Z]-(\d{3})[A-Z]?$/.exec(id);
  return m ? +m[1] : null;
};

/** L'entrée de registre d'une mission du dépôt (voir l'en-tête) : les champs que le registre sait lire, bornés ; rien d'autre. */
export function entryOfMission(doc, path, now = new Date().toISOString()) {
  const row = MS.rowOfMission(doc, path);
  if (!row) return null;
  const m = MS.readMission(doc),
    e = {
      id: row.id,
      formerId: '',
      series: '',
      number: numberOf(row.id) ?? '',
      type: row.kind,
      family: row.family,
      subtype: row.subtype,
      title: row.title,
      operation: m?.operation && (m.operation.id || m.operation.name) ? {
        id: cut(m.operation.id, 40),
        name: cut(m.operation.name, 120)
      } : null,
      organisation: row.organisation,
      aircraftTypes: row.types,
      callsigns: row.callsigns,
      origin: row.origin,
      destination: row.destination,
      folder: row.folder,
      files: [row.file],
      addedAt: now
    };
  if (row.blockMin !== null) e.estimate = {
    block: row.blockMin
  };
  if (row.airline) e.airline = row.airline;
  if (row.category) e.category = row.category;
  return e;
}

/** Ce que « Mettre à jour » ferait (voir l'en-tête). `status` : Map idx → 'ok' | 'missing' | 'unreadable' | 'refused' ; `found` : les
 *  entrées de missions du dépôt absentes du registre ([{ path, entry }]). Les lignes sans fichier restent (le fichier peut ne pas être
 *  encore arrivé) : elles sont comptées, jamais retirées ; un identifiant en double garde la ligne dont l'identifiant est déjà le bon,
 *  sinon la première ; un ancien identifiant (« 71 » pour F-071) est remplacé par celui du dossier, l'ancien gardé en formerId. */
export function planOf(doc, status, found) {
  const list = entries(doc),
    byId = new Map();
  for (const e of list) {
    const g = byId.get(e.row.id) || [];
    g.push(e);
    byId.set(e.row.id, g);
  }
  const dup = [],
    former = [];
  for (const g of byId.values()) {
    const keep = g.find(e => cut(e.raw.id, 40) === e.row.id) || g[0];
    for (const e of g) {
      if (e !== keep) dup.push(e.idx);
      else if (cut(e.raw.id, 40) !== e.row.id) former.push(e.idx);
    }
  }
  const ids = new Set(list.map(e => e.row.id));
  return {
    add: (found || []).filter(f => f?.entry && !ids.has(f.entry.id)),
    // une ligne non lue (au-delà de la limite de lecture de l'écran) n'est pas « sans fichier » : on n'en sait rien (audit 174)
    noFile: list.filter(e => status?.get(e.idx) && !['ok', 'notread'].includes(status.get(e.idx))).map(e => e.idx),
    dup,
    former
  };
}

/** Le plan appliqué à une copie du document (voir l'en-tête) ; la date de mise à jour est retouchée. */
export function applyPlan(doc, plan, now = new Date().toISOString()) {
  const out = structuredClone(doc && typeof doc === 'object' ? doc : {});
  out.missions = Array.isArray(out.missions) ? out.missions : [];
  const list = entries(out);
  for (const i of plan.former || []) {
    const e = list.find(x => x.idx === i);
    if (e) {
      if (!cut(e.raw.formerId, 40)) e.raw.formerId = cut(e.raw.id, 40);
      e.raw.id = e.row.id;
    }
  }
  for (const i of [...(plan.dup || [])].sort((a, b) => b - a)) out.missions.splice(i, 1);
  for (const f of plan.add || []) out.missions.push(structuredClone(f.entry));
  out.updatedAt = now;
  return out;
}

/** Une valeur de série ou de numéro saisie : '' (effacée) ou un entier de 0 à 99999 ; undefined si refusée. */
const whole = v => {
  const s = String(v ?? '').trim();
  return s === '' ? '' : /^\d{1,5}$/.test(s) ? +s : undefined;
};

/** Corriger une ligne (voir l'en-tête) : la ligne à la place `idx` doit encore avoir l'identifiant `id` (le registre a pu changer). */
export function editEntry(doc, idx, id, fields, now = new Date().toISOString()) {
  const out = structuredClone(doc && typeof doc === 'object' ? doc : {}),
    e = entries(out).find(x => x.idx === idx);
  if (!e || e.row.id !== id) return {
    error: 'stale'
  };
  const series = whole(fields?.series),
    number = whole(fields?.number);
  if (series === undefined) return {
    error: 'series'
  };
  if (number === undefined) return {
    error: 'number'
  };
  e.raw.title = cut(fields?.title, 200);
  e.raw.series = series;
  e.raw.number = number;
  const name = cut(fields?.operation, 120),
    op = e.raw.operation && typeof e.raw.operation === 'object' ? e.raw.operation : null;
  if (op) op.name = name;
  else if (name) e.raw.operation = {
    id: '',
    name
  };
  out.updatedAt = now;
  return {
    doc: out
  };
}

/** Retirer une ligne du registre (voir l'en-tête). */
export function removeEntry(doc, idx, id, now = new Date().toISOString()) {
  const out = structuredClone(doc && typeof doc === 'object' ? doc : {}),
    e = entries(out).find(x => x.idx === idx);
  if (!e || e.row.id !== id) return {
    error: 'stale'
  };
  out.missions.splice(idx, 1);
  out.updatedAt = now;
  return {
    doc: out
  };
}

/** Le texte du registre : l'en-tête d'origine (commentaire), puis le document en YAML. */
export function withHeader(doc, Y, now = new Date().toISOString()) {
  // audit 186 : un registre à ancres (écrit par n'importe quel pilote) n'est jamais déplié par Y.dump — l'écriture est refusée
  if (MS.shapeOf(doc)) throw new Error('mission_registry.yaml: YAML aliases or too large — not rewritten');
  return `# Registre des missions — tenu par l'application (modules/missions, Compagnie › Registre)\n# ${now}\n${Y.dump(doc, {
    lineWidth: -1,
    noRefs: true
  })}`;
}
