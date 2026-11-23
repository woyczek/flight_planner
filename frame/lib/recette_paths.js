// V3 frame/lib (propriétaire : le cadre) — les CHEMINS DE TEST de la recette (SOG-0544 voisine ; décision de l'ergonome, Q4 du 21 nov. 2026) : quelques parcours d'usage qui valident beaucoup de fiches d'un coup, affichés AVANT les
// essais isolés. Le fichier source est organisation/RECETTE_CHEMINS.json (écrit par le relais seul), embarqué par tools/recette_build.py dans frame/help/recette.json sous `paths` ; ce module est la lecture et la règle, pures :
// ni page, ni état, ni stockage, ni réseau (frame/help/recette.js les appelle). Ce qui est lu est une ENTRÉE NON FIABLE : seuls les champs dits sont recopiés (jamais une clé quelconque), textes bornés et sans caractère de commande,
// nombres et longueurs bornés ; un fichier illisible ou vide donne `null` — pas de chemins, et la recette d'aujourd'hui inchangée.
//
// API :
//   pathsOf(raw) → { preamble, paths: [{ id, title, where, note, folded, ref, covers: [SOG-…], steps: [{ gesture, expect, fiches: [SOG-…], optional }] }], majors: [SOG-…], noTest: [{ id, title, reason }] } | null
//     les chemins dans l'ordre de `order` (ceux qu'il ne nomme pas à la suite) ; un chemin qui n'a ni pas ni fiche couverte est écarté.
//   stepKey(pid, i) → « C1:3 » ; gist(gesture) → le début du geste, que le magasin de l'appareil garde pour reconnaître un pas qui a changé.
//   stepsOf(raw, paths) → les états de pas gardés sur l'appareil ({ 'C1:3': { s: 'ok' | 'ko', c?, g, at? } }) qui correspondent encore à un pas des chemins (même clé ET même début de geste).
//   citesOf(paths) → Map fiche → [{ key, optional }] : les pas qui citent la fiche.
//   coverage(paths, ids) → Map fiche → id du chemin : chaque essai de `ids` couvert (par un pas ou par `covers`) l'est par le PREMIER chemin qui le cite : jamais listé deux fois.
//   derive(cites, steps) → { verdict: 'ok' | 'ko', comment? } | null : le verdict d'une fiche d'après les pas qui la citent (voir ci-dessous) ; null : rien à écrire.
// La règle des verdicts (la même que le brief) : un pas MAUVAIS donne « ko » à SES fiches seulement, avec son commentaire ; une fiche reçoit « ok » quand tous les pas qui la citent et qui ne sont pas facultatifs sont bons et
// qu'au moins un pas qui la cite est bon (un pas facultatif non joué ne bloque pas ; une fiche que citent seulement des pas facultatifs non joués reste en attente) ; « pas joué » n'écrit rien.
import {
  own
} from './untrusted.js'; // la garde « clé propre » est celle du cadre (frame/lib/untrusted.js), jamais une copie
export const ID = /^SOG-\d{4}$/;
export const PID = /^C\d{1,3}$/;
export const LIMITS = {
  paths: 30,
  steps: 40,
  fiches: 12,
  covers: 80,
  majors: 40,
  noTest: 200,
  id: 20,
  title: 120,
  where: 30,
  note: 300,
  preamble: 300,
  gesture: 600,
  expect: 600,
  reason: 200,
  comment: 2000,
  store: 400
};
/** Un texte : sans caractère de commande, rogné, borné ; '' si ce n'est pas un texte. */
const text = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';
const ids = (a, n) => [...new Set((Array.isArray(a) ? a : []).filter(x => typeof x === 'string' && ID.test(x)))].slice(0, n);
/** Un titre : un texte, ou { fr, en, de, es } (la forme de recette.json) ; rendu tel quel pour row() de recette.js. */
const titleOf = (o, n) => {
  if (typeof o === 'string') return text(o, n);
  const t = {};
  for (const k of ['fr', 'en', 'de', 'es']) {
    const v = text(own(o, k), n);
    if (v) t[k] = v;
  }
  return t.fr || t.en ? t : '';
};

export const stepKey = (pid, i) => `${pid}:${i}`;
export const gist = g => text(g, 40);

/** Les chemins lus d'un fichier non fiable (voir l'en-tête) ; null quand il n'y a rien à montrer. */
export function pathsOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const list = [];
  const seen = new Set();
  for (const p of (Array.isArray(raw.paths) ? raw.paths : []).slice(0, LIMITS.paths)) {
    const id = text(own(p, 'id'), LIMITS.id);
    if (!PID.test(id) || seen.has(id)) continue;
    const steps = (Array.isArray(own(p, 'steps')) ? p.steps : []).slice(0, LIMITS.steps).map(s => ({
      gesture: text(own(s, 'gesture'), LIMITS.gesture),
      expect: text(own(s, 'expect'), LIMITS.expect),
      fiches: ids(own(s, 'fiches'), LIMITS.fiches),
      optional: own(s, 'optional') === true
    })).filter(s => s.gesture);
    const covers = ids(own(p, 'covers'), LIMITS.covers);
    if (!steps.length && !covers.length) continue;
    seen.add(id);
    const ref = text(own(p, 'ref'), 9);
    list.push({
      id,
      title: text(own(p, 'title'), LIMITS.title) || id,
      where: text(own(p, 'where'), LIMITS.where),
      note: text(own(p, 'note'), LIMITS.note),
      folded: own(p, 'folded') === true,
      ref: ID.test(ref) ? ref : '',
      covers,
      steps
    });
  }
  const order = (Array.isArray(raw.order) ? raw.order : []).filter(x => typeof x === 'string');
  const paths = [...order.map(id => list.find(p => p.id === id)).filter(Boolean), ...list.filter(p => !order.includes(p.id))]
    .filter((p, i, a) => a.indexOf(p) === i);
  const noTest = [];
  for (const n of (Array.isArray(raw.no_test) ? raw.no_test : []).slice(0, LIMITS.noTest)) {
    const id = own(n, 'id');
    if (typeof id === 'string' && ID.test(id) && !noTest.some(x => x.id === id)) noTest.push({
      id,
      title: titleOf(own(n, 'title'), LIMITS.title),
      reason: text(own(n, 'reason'), LIMITS.reason)
    });
  }
  const majors = ids(raw.majors_first, LIMITS.majors);
  if (!paths.length && !majors.length && !noTest.length) return null;
  return {
    preamble: text(raw.preamble, LIMITS.preamble),
    paths,
    majors,
    noTest
  };
}

/** Les états de pas gardés sur l'appareil, ceux qui visent encore un pas des chemins (même clé, même début de geste). */
export function stepsOf(raw, paths) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  let n = 0;
  for (const p of paths || []) p.steps.forEach((st, i) => {
    const k = stepKey(p.id, i),
      e = own(raw, k);
    if (n >= LIMITS.store || !e || typeof e !== 'object' || (e.s !== 'ok' && e.s !== 'ko') || e.g !== gist(st.gesture)) return;
    const c = text(e.c, LIMITS.comment);
    if (e.s === 'ko' && !c) return; // un pas mauvais se dit
    out[k] = {
      s: e.s,
      g: e.g,
      ...(c ? {
        c
      } : {}),
      ...(typeof e.at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(e.at) ? {
        at: e.at
      } : {})
    };
    n++;
  });
  return out;
}

/** Fiche → les pas qui la citent. */
export function citesOf(paths) {
  const m = new Map();
  for (const p of paths || []) p.steps.forEach((st, i) => {
    for (const f of st.fiches) {
      if (!m.has(f)) m.set(f, []);
      m.get(f).push({
        key: stepKey(p.id, i),
        optional: st.optional
      });
    }
  });
  return m;
}

/** Chaque essai de `idsOfTests` couvert par un chemin → l'identifiant du premier chemin (dans l'ordre) qui le cite. */
export function coverage(paths, idsOfTests) {
  const want = new Set(idsOfTests),
    out = new Map();
  for (const p of paths || [])
    for (const f of [...p.steps.flatMap(s => s.fiches), ...p.covers])
      if (want.has(f) && !out.has(f)) out.set(f, p.id);
  return out;
}

/** Le verdict d'une fiche d'après les pas qui la citent (`cites` : citesOf(paths).get(fiche)) et leurs états (`steps` : stepsOf). */
export function derive(cites, steps) {
  if (!cites?.length) return null;
  const st = k => steps?.[k]?.s || null;
  const bad = cites.filter(c => st(c.key) === 'ko');
  if (bad.length) {
    const comment = text([...new Set(bad.map(c => steps[c.key].c).filter(Boolean))].join(' / '), LIMITS.comment);
    return comment ? {
      verdict: 'ko',
      comment
    } : null;
  }
  const good = cites.some(c => st(c.key) === 'ok');
  if (!good || !cites.every(c => c.optional || st(c.key) === 'ok')) return null;
  // les commentaires des pas bons qui citent la fiche (un pas a son champ, comme un test unitaire) : « Validé » avec ses mots
  const comment = text([...new Set(cites.filter(c => st(c.key) === 'ok').map(c => steps[c.key].c).filter(Boolean))].join(' / '), LIMITS
    .comment);
  return comment ? {
    verdict: 'ok',
    comment
  } : {
    verdict: 'ok'
  };
}
