// V3 missions — « Ajouter des missions » (SOG-0212 b ; l'utilisateur, 10 nov. : « rajouter rapidement la possibilité d'ajouter une
// mission (ou un pool de missions) depuis un yaml ») : la lecture, pure, de textes YAML choisis ou collés, AVANT toute écriture. Ni page,
// ni stockage, ni réseau : le module lui donne les textes, le lecteur YAML du cadre et ce qui existe déjà ; il reçoit ce qu'il peut écrire
// et ce qui est refusé, avec la raison. Les textes viennent de l'appareil d'un pilote : entrée non fiable (§ 10.36) — bornes, identifiant et
// famille à la règle, le chemin écrit TOUJOURS construit ici (jamais un chemin venu du fichier), les textes à échapper par qui les affiche.
//
//   read(sources, { yaml, known, paths }) → { items, refused }
//     sources  [{ name, text }] (un fichier choisi, ou le texte collé)
//     yaml     le lecteur YAML du cadre (js-yaml : loadAll, dump)
//     known    Map id → { folder, file } des missions déjà listées ; paths : Set des fichiers déjà là sous missions/
//     items    [{ id, family, title, series, airline, path, text, doc, exists }] — path : celui d'une mission déjà là (même identifiant),
//              sinon missions/<lettre>_<FAMILLE>/<ID>/mission<ID>.yaml ; text : le texte du fichier quand il ne porte qu'une mission (ses
//              commentaires gardés), sinon la mission réécrite ; airline '' : personnelle (MS.ownerOf)
//     refused  [{ name, id, reason, line?, msg? }] — reason : tooMany, tooBig, yaml (line, msg), noMission, badId, badFamily,
//              organisation, twice, alias (ancres YAML : jamais dépliées par Y.dump, audit 186)
//   Formes lues (un « pool ») : plusieurs documents séparés par « --- », une liste `missions:` de missions, une liste au premier niveau,
//   ou une seule mission (`mission: { id, type }`, la forme du CPCO).
import * as MS from '../../frame/lib/mission.js';

export const LIMITS = Object.freeze({
  files: 20,
  bytes: 1000000,
  missions: 200
});
/** L'identifiant d'une mission : « A-001A », « F-071 » (la lettre de la famille, trois chiffres, puis la lettre d'un vol lié — A à Y,
 *  liés à la fiche sans suffixe — ou Z, l'organisation ; ou rien : SOG-0036, Q-0048, jamais « variante »). */
export const MISSION_ID = /^[A-Z]-\d{3}[A-Z]?$/;
/** La famille d'une mission (mission.type) : « COMBAT », « MEDEVAC »… */
export const FAMILY = /^[A-Z][A-Z0-9_]{1,23}$/;
const clean = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Les missions d'un texte (voir l'en-tête) ; single : le texte ne porte qu'une mission, au premier niveau. */
function docsOf(Y, text) {
  const all = Y.loadAll(text).filter(d => d !== null && d !== undefined),
    docs = [];
  for (const d of all) {
    if (Array.isArray(d)) docs.push(...d);
    else if (d && typeof d === 'object' && !d.mission && Array.isArray(d.missions)) docs.push(...d.missions);
    else docs.push(d);
  }
  return {
    docs,
    single: all.length === 1 && docs.length === 1 && docs[0] === all[0]
  };
}

/** Lit les textes (voir l'en-tête). */
export function read(sources, {
  yaml: Y,
  known = new Map(),
  paths = new Set()
} = {}) {
  const items = [],
    refused = [],
    seen = new Set();
  for (const [i, src] of(Array.isArray(sources) ? sources : []).entries()) {
    const name = clean(src?.name, 120),
      text = String(src?.text ?? '');
    if (i >= LIMITS.files) {
      refused.push({
        name,
        id: '',
        reason: 'tooMany'
      });
      continue;
    }
    if (text.length > LIMITS.bytes) {
      refused.push({
        name,
        id: '',
        reason: 'tooBig'
      });
      continue;
    }
    let got;
    try {
      got = docsOf(Y, text);
    } catch (e) {
      refused.push({
        name,
        id: '',
        reason: 'yaml',
        line: Number.isInteger(e?.mark?.line) ? e.mark.line + 1 : 0,
        msg: clean(e?.reason || e?.message, 120)
      });
      continue;
    }
    for (const doc of got.docs) {
      const m = MS.readMission(doc),
        id = clean(m?.id, 40),
        family = clean(m?.type, 40).toUpperCase(),
        no = reason => refused.push({
          name,
          id,
          reason
        });
      if (items.length >= LIMITS.missions) {
        no('tooMany');
        continue;
      }
      if (!m) no('noMission');
      else if (!MISSION_ID.test(id)) no('badId');
      else if (!FAMILY.test(family)) no('badFamily');
      else if (m.organisation) no('organisation');
      else if (seen.has(id)) no('twice');
      else if (MS.shapeOf(doc)) no('alias'); // audit 186 : jamais déplié par Y.dump (une bombe d'alias figerait l'écriture)
      else {
        seen.add(id);
        const k = known.get(id),
          own = k?.folder && k?.file ? `missions/${k.folder}/${k.file}` : '',
          path = own || `missions/${id[0]}_${family}/${id}/mission${id}.yaml`,
          out = got.single ? text : Y.dump(doc, {
            lineWidth: 160,
            noRefs: true
          });
        if (out.length > LIMITS.bytes) {
          no('tooBig');
          continue;
        }
        items.push({
          id,
          family,
          title: clean(m.title),
          series: clean(m.subtype, 80),
          airline: MS.airlineCode(doc?.mission?.airline ?? doc?.airline),
          path,
          text: out,
          doc,
          exists: !!k || paths.has(path)
        });
      }
    }
  }
  return {
    items,
    refused
  };
}
