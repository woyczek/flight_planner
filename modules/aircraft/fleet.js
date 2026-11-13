// V3 aircraft — les règles de la flotte de la compagnie (airline/fleet.json), en calcul pur (modules/aircraft/SPEC.md § 3) :
// normaliser un appareil saisi, les champs changés, l'écrire ou le retirer d'un fichier relu juste avant, la recherche.
// Ni page, ni état, ni réseau : le module appelle ces fonctions puis écrit.
//
// API :
//   FIELDS : les champs édités, dans l'ordre du formulaire.
//   normalize(form) → appareil { registration, type, variant, operator, callsigns: [], base, tacticalNumber, operational } ;
//     immatriculation et type en majuscules, indicatifs séparés par des virgules ou des espaces, sans doublon.
//   changed(before, after) → [champ] : les champs dont la valeur diffère (indicatifs comparés en liste).
//   upsert(file, ac, { was, by, now }) → nouveau fichier : l'appareil remplace celui de même immatriculation (ou de `was`,
//     l'immatriculation d'avant une modification), les champs que l'éditeur ne porte pas (location, locationAt, number…)
//     gardés ; ajouté sinon ; updated_at et by posés.
//   retire(file, registration, { by, now }) → nouveau fichier sans cet appareil.
//   matches(ac, q) : la recherche (immatriculation, type, variante, indicatif, base, opérateur ; sans casse).

/** Les champs édités, dans l'ordre du formulaire (les deux groupes de l'éditeur). */
export const FIELDS = ['registration', 'type', 'variant', 'operator', 'callsigns', 'base', 'tacticalNumber', 'operational'];

/** Un texte nettoyé (blancs repliés). */
const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

/** Un appareil saisi, normalisé (voir l'en-tête). */
export function normalize(form) {
  const f = form || {},
    calls = Array.isArray(f.callsigns) ? f.callsigns : String(f.callsigns ?? '').split(/[\s,;]+/);
  return {
    registration: clean(f.registration).toUpperCase(),
    type: clean(f.type).toUpperCase(),
    variant: clean(f.variant),
    operator: clean(f.operator),
    callsigns: [...new Set(calls.map(c => clean(c).toUpperCase()).filter(Boolean))],
    base: clean(f.base),
    tacticalNumber: clean(f.tacticalNumber),
    operational: f.operational !== false
  };
}

/** Les champs changés entre deux appareils (voir l'en-tête). */
export function changed(before, after) {
  const a = normalize(before || {}),
    b = normalize(after || {});
  return FIELDS.filter(k => k === 'callsigns' ? a[k].join() !== b[k].join() : a[k] !== b[k]);
}

/** Le fichier de la flotte, lu ou vide, au schéma 1 (une copie : la valeur lue peut être figée). */
const fileOf = file => ({
  schema: 1,
  ...(file && typeof file === 'object' ? structuredClone(file) : {}),
  aircraft: Array.isArray(file?.aircraft) ? structuredClone(file.aircraft) : []
});

/** Écrit un appareil dans le fichier relu juste avant (voir l'en-tête). */
export function upsert(file, ac, {
  was = '',
  by = '',
  now = new Date().toISOString()
} = {}) {
  const f = fileOf(file),
    a = normalize(ac),
    key = String(was || a.registration).toUpperCase(),
    i = f.aircraft.findIndex(x => String(x?.registration || '').toUpperCase() === key);
  if (i >= 0) f.aircraft[i] = {
    ...f.aircraft[i],
    ...a
  };
  else f.aircraft.push(a);
  f.updated_at = now;
  if (by) f.by = by;
  return f;
}

/** Retire un appareil du fichier relu juste avant (voir l'en-tête). */
export function retire(file, registration, {
  by = '',
  now = new Date().toISOString()
} = {}) {
  const f = fileOf(file),
    key = String(registration || '').toUpperCase();
  f.aircraft = f.aircraft.filter(x => String(x?.registration || '').toUpperCase() !== key);
  f.updated_at = now;
  if (by) f.by = by;
  return f;
}

/** SOG-0270 (refus du 13/11) : les types qui répondent à la recherche, la règle des fiches — la base locale des types (`search` :
 *  désignateur, nom d'usage, mot du modèle ; [{ code, label }]) et les fiches du registre dont le nom, le code ou le type répond ; un
 *  type une fois, le code de la base d'abord ; `n` au plus. Pure. */
export function typesFor(q, {
  search = null,
  sheets = [],
  n = 6
} = {}) {
  const t = clean(q);
  if (t.length < 2) return [];
  const out = new Map(),
    bare = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    b = bare(t);
  for (const x of (typeof search === 'function' ? search(t, n) || [] : [])) {
    const code = String(x?.code || '').toUpperCase().slice(0, 8);
    if (/^[A-Z0-9]{2,8}$/.test(code) && !out.has(code)) out.set(code, String(x?.label || code).slice(0, 80));
  }
  for (const sh of Array.isArray(sheets) ? sheets : []) {
    const code = String(sh?.icao || sh?.type || '').toUpperCase().slice(0, 8);
    if (!/^[A-Z0-9]{2,8}$/.test(code) || out.has(code)) continue;
    if ([sh?.name, sh?.id, sh?.icao, sh?.type].some(v => b && bare(v).includes(b))) out.set(code, String(sh?.name || code).slice(0, 80));
  }
  return [...out].slice(0, n).map(([code, label]) => ({
    code,
    label
  }));
}

/** La recherche dans la flotte (voir l'en-tête) ; `types` (SOG-0270) : les codes de type qui répondent à la recherche des fiches (typesFor) —
 *  un aéronef de ce type répond aussi. */
export function matches(ac, q, types = null) {
  const s = clean(q).toUpperCase();
  if (!s) return true;
  // SOG-0313 : « fbhhh » trouve F-BHHH — les séparateurs (tiret, espace, point) ne comptent pas, d'un côté comme de l'autre
  const bare = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, ''),
    b = bare(s);
  return [ac?.registration, ac?.type, ac?.variant, ac?.base, ac?.operator, ...(ac?.callsigns || [])].some(v => String(v ?? '')
    .toUpperCase().includes(s) || !!b && bare(v).includes(b)) || !!types?.has?.(String(ac?.type || '').toUpperCase());
}
