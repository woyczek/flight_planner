// V3 missions — changer la compagnie d'une mission (SOG-0223 ; l'utilisateur, 10 nov. : « il faut pouvoir changer une mission de
// compagnie. comme pour les appareils »). Pur : ni page, ni stockage, ni réseau. Le texte YAML d'une mission est retouché à la main
// (ses commentaires et sa mise en page gardés) : le champ `airline` retiré partout où il était (`mission.airline` et `airline` au
// premier niveau), puis, pour une compagnie, une ligne `airline: <code>` au premier niveau ; le résultat est relu et comparé à ce qui
// était voulu (tout le reste identique) ; s'il ne l'est pas (une forme du texte que la retouche ne sait pas faire), la mission est
// réécrite entière (dump). Le code vient toujours de l'index des compagnies (ou « perso », qui retire le champ), jamais d'une saisie.
//
//   withAirline(text, code, yaml) → { text, dumped } | null (null : le texte n'est pas une mission lisible)
//   choices(airlines) → [{ code, name }] : les compagnies de l'index (code à la règle), puis Personnel (code « perso »)
import * as MS from '../../frame/lib/mission.js';

/** Le document sans son champ airline (aux deux places), pour comparer. */
const bare = doc => {
  const d = JSON.parse(JSON.stringify(doc ?? null));
  if (d && typeof d === 'object') {
    delete d.airline;
    if (d.mission && typeof d.mission === 'object') delete d.mission.airline;
  }
  return JSON.stringify(d);
};

/** Le texte de la mission avec la compagnie `code` (« perso » ou '' : sans champ, la mission est personnelle). */
export function withAirline(text, code, Y) {
  let doc;
  try {
    doc = Y.load(String(text ?? ''));
  } catch {
    return null;
  }
  if (!MS.readMission(doc) || MS.shapeOf(doc)) return null; // audit 186 : un document à ancres n'est ni comparé ni réécrit
  const want = MS.airlineCode(code) && code !== MS.PERSONAL ? code : '',
    nl = /\r\n/.test(text) ? '\r\n' : '\n';
  // retirés, ligne à ligne : `airline:` au premier niveau ; `airline:` au premier retrait du bloc `mission:` écrit en lignes ; la clé
  // dans un `mission: { … }` écrit en ligne
  const out = [];
  let inMission = false,
    indent = null;
  for (const line of String(text).replace(/\r\n/g, '\n').split('\n')) {
    const top = /^\S/.test(line) && !/^#/.test(line);
    if (top) {
      inMission = /^mission:[ \t]*(#.*)?$/.test(line);
      indent = null;
    }
    if (top && /^airline:/.test(line)) continue;
    if (!top && inMission && line.trim() && !/^\s*#/.test(line)) {
      const ind = /^[ \t]*/.exec(line)[0].length;
      indent ??= ind;
      if (ind === indent && /^\s*airline:/.test(line)) continue;
    }
    out.push(top && /^mission:[ \t]*\{/.test(line) ? line.replace(/,[ \t]*airline:[ \t]*[\w-]+/, '').replace(
      /\{[ \t]*airline:[ \t]*[\w-]+[ \t]*,[ \t]*/, '{ ') : line);
  }
  let t = out.join('\n');
  if (want) t = `${t.replace(/\n*$/, '\n')}airline: ${want}\n`;
  let ok = false;
  try {
    const back = Y.load(t);
    ok = bare(back) === bare(doc) && MS.ownerOf({
      airline: back?.mission?.airline ?? back?.airline
    }) === (want || MS.PERSONAL);
  } catch {
    ok = false;
  }
  if (ok) return {
    text: t.replace(/\n/g, nl),
    dumped: false
  };
  const d = JSON.parse(JSON.stringify(doc));
  delete d.airline;
  if (d.mission && typeof d.mission === 'object') delete d.mission.airline;
  if (want) d.airline = want;
  return {
    text: Y.dump(d, {
      lineWidth: 160,
      noRefs: true
    }),
    dumped: true
  };
}

/** Les compagnies proposées : celles de l'index (code à la règle, sans « perso » ni « default »), puis Personnel. */
export function choices(airlines, personalName) {
  const seen = new Set(),
    out = [];
  for (const a of Array.isArray(airlines) ? airlines : []) {
    const code = MS.airlineCode(a?.code);
    if (!code || code === MS.PERSONAL || code === 'default' || seen.has(code)) continue;
    seen.add(code);
    out.push({
      code,
      name: String(a?.name || code).replace(/\s+/g, ' ').trim().slice(0, 60)
    });
  }
  out.push({
    code: MS.PERSONAL,
    name: personalName
  });
  return out;
}
