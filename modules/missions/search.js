// V3 missions — la recherche dans le contenu des missions (SOG-0288), en calcul pur : ni page, ni stockage, ni réseau. L'appelant
// (module.js) bâtit l'index en mémoire à la première frappe, depuis les fichiers de mission déjà sur l'appareil ; rien n'est écrit.
//
// API :
//   fold(text) → le texte comparable : minuscules, sans accent, tiret, apostrophe et ponctuation comme une espace, espaces repliées
//     (« Clermont-Ferrand » = « clermont ferrand »).
//   missionFields(mission) → [[clé, texte replié]] : les champs d'une mission lue (MS.readMission) — titre, résumé, description,
//     objectifs, risques (danger, conséquence, parade), lieux (origine, destination, cible, points, rendez-vous, zones), notes, indicatifs,
//     types ; chaque champ borné à FIELD_MAX signes, le tout à MISSION_MAX (le fichier est écrit par n'importe quel pilote).
//   rowFields(row) → [[clé, texte replié]] : la ligne du registre seule (mission non lue sur l'appareil) — les champs que lisait la
//     recherche d'avant (identifiant, ancien identifiant, titre, opération, famille, activité, terrains, indicatifs, types).
//   where(fields, q) → les clés des champs où se trouve la recherche repliée `q` (déjà passée par fold), dans l'ordre de KEYS ; [] sinon.
//   KEYS : l'ordre des champs, celui des mots de « dans : … ».

const FIELD_MAX = 4000,
  MISSION_MAX = 16000;

/** Les clés des champs, dans l'ordre où « dans : … » les dit. */
export const KEYS = ['id', 'title', 'summary', 'description', 'objectives', 'risks', 'places', 'notes', 'callsigns', 'types', 'line'];

/** Le texte comparable (voir l'en-tête). */
export function fold(text) {
  return String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Les textes non vides d'une liste, joints par une espace, bornés à FIELD_MAX signes avant repli. */
const join = list => list.flat(Infinity).filter(v => typeof v === 'string' || typeof v === 'number').map(String).filter(Boolean).join(' ')
  .slice(0, FIELD_MAX);

/** Les champs [[clé, texte replié]] non vides, le total borné à MISSION_MAX. */
function bounded(pairs) {
  let left = MISSION_MAX;
  const out = [];
  for (const [k, raw] of pairs) {
    const t = fold(raw).slice(0, Math.max(0, left));
    if (!t) continue;
    out.push([k, t]);
    left -= t.length;
    if (left <= 0) break;
  }
  return out;
}

/** Les champs d'une mission lue (voir l'en-tête). */
export function missionFields(m) {
  if (!m || typeof m !== 'object') return [];
  const arr = v => Array.isArray(v) ? v : [],
    name = p => p && typeof p === 'object' ? [p.name, p.icao, p.id] : [];
  return bounded([
    ['id', join([m.id])],
    ['title', join([m.title])],
    ['summary', join([m.summary])],
    ['description', join([arr(m.details)])],
    ['objectives', join([m.objectives?.primary, arr(m.objectives?.secondary)])],
    ['risks', join(arr(m.risks).map(r => [r?.hazard, r?.consequence, r?.mitigation]))],
    ['places', join([name(m.origin), name(m.destination), name(m.target), Object.values(m.points || {}).map(name), arr(m.turns).map(
        name),
      arr(m.rendezvous).map(name), arr(m.zones).map(name)
    ])],
    ['notes', join([arr(m.notes), arr(m.constraints)])],
    ['callsigns', join([arr(m.teams).map(t => [t?.name, t?.service]), arr(m.aircraft).map(a => a?.callsign)])],
    ['types', join([m.type, m.subtype, arr(m.teams).map(t => t?.type), arr(m.aircraft).map(a => a?.type)])]
  ]);
}

/** Les champs d'une ligne du registre (voir l'en-tête). */
export function rowFields(r) {
  if (!r || typeof r !== 'object') return [];
  const arr = v => Array.isArray(v) ? v : [];
  return bounded([
    ['id', join([r.id, r.formerId])],
    ['title', join([r.title])],
    ['line', join([r.operation, r.family, r.kind, r.subtype, arr(r.callsigns), arr(r.words), r.originIcao, r.destinationIcao, r.origin,
      r
      .destination, arr(r.types)
    ])]
  ]);
}

/** Les clés des champs où se trouve `q` (voir l'en-tête). */
export function where(fields, q) {
  if (!q) return [];
  const hit = new Set(fields.filter(([, t]) => ` ${t} `.includes(` ${q}`) || t.includes(q)).map(([k]) => k));
  return KEYS.filter(k => hit.has(k));
}
