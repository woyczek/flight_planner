// V3 data — l'état des AUTRES jeux d'après les verbes d'état du lanceur (SOG-0119 ; AeroDB 345ad3c15) : `proc/status { states }`, `vfr/status {}` et `aircraft/status {}`, en lecture seule, comme `base/status`. « À jour » est toujours ce que le poste a PUBLIÉ
// pour le cycle en vigueur, jamais ce qu'il a seulement téléchargé. Pur : ni page, ni événement, ni stockage ; tout ce que dit le lanceur est une entrée non fiable, bornée ici (états d'une liste fermée, codes d'une liste fermée, entiers bornés).

/** Les verbes d'état, par jeu (le nom du verbe tel que `regen/verbs` le liste). */
export const SET_STATE_VERBS = Object.freeze({
  proc: 'proc/status',
  vfr: 'vfr/status',
  aircraft: 'aircraft/status',
  pdf: 'pdf/status' // les bibliothèques de lecture des PDF (SOG-0376) : un état, pas un jeu de données
});
const STATES = ['up-to-date', 'stale', 'missing', 'n/a'];
/** Les codes de raison que la page sait dire, par jeu (liste fermée du contrat) ; un autre code est écarté. */
const CODES = Object.freeze({
  proc: ['older-than-cycle', 'not-fetched', 'not-built', 'ead-per-aerodrome', 'no-source', 'held-older'],
  vfr: ['partial', 'older-than-cycle', 'unknown-cycle', 'no-base', 'not-fetched', 'not-built'],
  aircraft: ['no-db', 'fleet-types-missing']
});
const PREFIX = /^[A-Z0-9]{1,4}$/;
const int = v => Number.isInteger(v) && v >= 0 && v <= 1e7 ? v : 0;
const day = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
/** Une raison lue : { code, n (le nombre que le code porte : have, count), of (expected), cycle } ; null pour un code hors de la liste fermée du jeu. */
function reasonOf(set, r) {
  const code = typeof r === 'string' ? r : r?.code;
  if (typeof code !== 'string' || !CODES[set].includes(code)) return null;
  const o = r !== null && typeof r === 'object' ? r : {};
  return {
    code,
    n: int(o.count ?? o.have),
    of: int(o.expected),
    cycle: day(o.cycle)
  };
}
const reasonsOf = (set, a) => (Array.isArray(a) ? a : []).slice(0, 6).map(r => reasonOf(set, r)).filter(Boolean);
/** La fin d'un travail de lecture : son résultat, ou null (échec, refus, forme inattendue). */
const resultOf = final => final?.state === 'done' && final.result !== null && typeof final.result === 'object' && final.result.ok !==
  false ? final.result : null;
/** L'état d'un jeu lu : { set, state ('up-to-date' | 'todo' | 'n/a'), n (ce qui est à faire : États, lignes), reasons: [{ code, n, of, cycle }], cycle } ; null quand le lanceur n'a rien de lisible à dire.
 *  `todo` : le lanceur dit `stale` ou `missing` (le poste n'a rien publié, ou pas pour ce cycle) ; `n/a` : le jeu n'a rien à suivre (une source lue à la demande). */
export function setStateOf(set, final) {
  const r = resultOf(final);
  if (!r || !Object.hasOwn(SET_STATE_VERBS, set)) return null;
  if (set === 'pdf') return pdfOf(r);
  if (set === 'proc') {
    const per = r.states !== null && typeof r.states === 'object' && !Array.isArray(r.states) ? r.states : null;
    if (!per) return null;
    // SOG-0428 : l'enregistrement de chaque État est la vérité de la ligne, de la liste et de la carte : construit en entier (`built`), ou des terrains lus à la main (`held`, avec ceux d'un cycle passé : `older`)
    const counted = (o, key) => o !== null && typeof o === 'object' && !Array.isArray(o) && int(o[key]) > 0 ? {
      n: int(o[key]),
      cycle: day(o.cycle),
      older: int(o.older)
    } : null;
    const rows = Object.entries(per).filter(([k, v]) => PREFIX.test(k) && v !== null && typeof v === 'object' && STATES.includes(v.state))
      .slice(0, 80).map(([k, v]) => ({
        prefix: k,
        state: v.state,
        reasons: reasonsOf('proc', v.reasons),
        built: counted(v.built, 'aerodromes'),
        held: counted(v.held, 'aerodromes'),
        cached: v.cached !== null && typeof v.cached === 'object' && v.cached.state === 'present'
      }));
    const todo = rows.filter(x => x.state === 'stale' || x.state === 'missing'),
      real = rows.filter(x => x.state !== 'n/a');
    return {
      set,
      state: todo.length ? 'todo' : real.length ? 'up-to-date' : 'n/a',
      n: todo.length,
      reasons: todo.flatMap(x => x.reasons.slice(0, 1).map(q => ({
        ...q,
        prefix: x.prefix
      }))).slice(0, 6),
      cycle: day(r.cycle),
      states: Object.fromEntries(rows.map(x => [x.prefix, x]))
    };
  }
  if (!STATES.includes(r.state)) return null;
  const reasons = reasonsOf(set, r.reasons);
  return {
    set,
    state: r.state === 'stale' || r.state === 'missing' ? 'todo' : r.state,
    n: r.state === 'stale' || r.state === 'missing' ? Math.max(1, reasons.length) : 0,
    reasons,
    cycle: day(r.cycle)
  };
}
const PKG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/,
  VER = /^[0-9A-Za-z][0-9A-Za-z.+!_-]{0,39}$/,
  SCRIPT = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,59}$/,
  PKG_STATES = ['ok', 'missing', 'old', 'new'],
  GROUP_IDS = ['pdf', 'ocr'];
/** L'état des bibliothèques de lecture des PDF d'après `pdf/status` (SOG-0376) : { set, packages: [{ name, version, minimum, maximum, state }], groups: [{ id, packages (noms), ready }], ready: { text, vectors, ocr }, script (le NOM du script de la plateforme, '' s'il est illisible), bounds (le fichier des bornes est refusé : rien n'est prêt) }.
 *  Tout vient du lanceur : noms, versions et script sont bornés par une forme fermée (un autre texte est écarté), les listes sont plafonnées ; null sans rien de lisible. */
function pdfOf(r) {
  const packages = (Array.isArray(r.packages) ? r.packages : []).slice(0, 20).filter(p => p !== null && typeof p === 'object' && typeof p
      .name === 'string' && PKG.test(p.name) && PKG_STATES.includes(p.state))
    .map(p => ({
      name: p.name,
      version: typeof p.version === 'string' && VER.test(p.version) ? p.version : '',
      minimum: typeof p.minimum === 'string' && VER.test(p.minimum) ? p.minimum : '',
      maximum: typeof p.maximum === 'string' && VER.test(p.maximum) ? p.maximum : '',
      state: p.state
    })),
    groups = (Array.isArray(r.groups) ? r.groups : []).slice(0, 4).filter(g => g !== null && typeof g === 'object' && GROUP_IDS.includes(g
      .id)).map(g => ({
      id: g.id,
      packages: (Array.isArray(g.packages) ? g.packages : []).slice(0, 10).filter(n => typeof n === 'string' && PKG.test(n)),
      ready: g.ready === true
    })),
    ok = r.ready !== null && typeof r.ready === 'object' ? r.ready : {},
    bounds = r.error === 'bounds';
  if (!packages.length && !bounds) return null;
  return {
    set: 'pdf',
    packages,
    groups,
    ready: {
      text: ok.text === true && !bounds,
      vectors: ok.vectors === true && !bounds,
      ocr: ok.ocr === true && !bounds
    },
    script: typeof r.script === 'string' && SCRIPT.test(r.script) ? r.script : '',
    bounds
  };
}
/** Ce que la ligne « Lecture des PDF » dit : { kind ('ready' | 'need' | 'bounds'), bad: les paquets du groupe pdf qui ne sont pas bons (6 au plus), script } d'après l'état lu (pdfOf). Le groupe OCR n'y est pas : il est facultatif, la ligne ne le dit jamais. */
export function pdfLine(d) {
  if (!d || d.set !== 'pdf') return null;
  if (d.bounds) return {
    kind: 'bounds',
    bad: [],
    script: d.script
  };
  if (d.ready.text && d.ready.vectors) return {
    kind: 'ready',
    bad: [],
    script: d.script
  };
  const names = new Set(d.groups.find(g => g.id === 'pdf')?.packages || []);
  return {
    kind: 'need',
    bad: d.packages.filter(p => (names.size ? names.has(p.name) : true) && p.state !== 'ok').slice(0, 6),
    script: d.script
  };
}
/** Les États (préfixes) à demander à `proc/status` : ceux que l'utilisateur a cochés, à défaut tous ceux de la liste, bornés ; [] sans. */
export const procArgs = ids => [...new Set((ids || []).filter(x => typeof x === 'string' && PREFIX.test(x)))].slice(0, 60);
