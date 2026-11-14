// V3 — les verdicts de la recette d'un appareil SANS lanceur (SOG-0357 : « la fiche de recette sur téléphone aussi »). Sans lanceur, un verdict n'est plus seulement gardé sur l'appareil : il part dans le dépôt
// des données, dans le dossier du trigramme de l'appareil, UN fichier `pilot/<trigramme>/recette/verdicts.json`, de la même forme que organisation/RECETTE.json :
//   { schema: 'sog-recette/1', updated, items: { 'SOG-nnnn': { verdict?, comment?, at?, history? } } }
// (history : les verdicts qu'une fiche a remplacés ou qu'on a remis à tester, vingt au plus, SOG-0351). Rien n'est cru de ce qui est lu : le fichier d'un dépôt peut avoir été écrit par n'importe quel pilote —
// identifiants SOG-nnnn, verdicts de la liste, commentaire borné et sans caractère de commande, historique borné, taille bornée ; jamais un chemin lu du fichier. Les MÊMES règles servent à l'écran qui lit
// (frame/help/recette.js), à l'adaptateur qui écrit (frame/app.js : il refuse hors du chemin et hors des bornes) et au contrôle du test. Code pur.
export const ID = /^SOG-\d{4}$/;
export const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
export const SCHEMA = 'sog-recette/1';
export const VERDICTS = ['ok', 'ko', 'reserve'];
export const NEEDS_COMMENT = ['ko', 'reserve'];
export const LIMITS = {
  items: 1000,
  comment: 2000,
  history: 20,
  doc: 900000 // la taille du texte du fichier (l'adaptateur refuse au-delà ; la lecture ignore au-delà de 1,5 Mo)
};
export const READ_MAX = 1500000;
export const pathOf = tri => /^[A-Za-z0-9]{2,8}$/.test(tri || '') ? `pilot/${tri}/recette/verdicts.json` : '';

/** La taille d'un texte en OCTETS (UTF-8), pas en caractères : les bornes de taille se comptent ainsi. */
const bytes = t => new TextEncoder().encode(String(t)).length;
/** Un texte : sans caractère de commande, rogné, borné ; '' si ce n'est pas un texte. */
export const text = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';

/** Un verdict complet { verdict, comment?, at? } aux règles (un refus ou des réserves sans commentaire n'en sont pas), sinon null. */
export function histItem(v) {
  if (!v || typeof v !== 'object' || !VERDICTS.includes(v.verdict)) return null;
  const e = {
      verdict: v.verdict
    },
    c = text(v.comment, LIMITS.comment);
  if (c) e.comment = c;
  if (typeof v.at === 'string' && AT.test(v.at)) e.at = v.at;
  return NEEDS_COMMENT.includes(v.verdict) && !e.comment ? null : e;
}
/** L'historique lu d'ailleurs : vingt éléments aux règles au plus, les plus récents. */
export const histOf = h => (Array.isArray(h) ? h : []).map(histItem).filter(Boolean).slice(-LIMITS.history);
/** Une entrée : un verdict aux règles { verdict, comment?, at?, history? }, ou une fiche remise à tester { history, at? } sans verdict. */
export function entryOf(v) {
  if (!v || typeof v !== 'object') return null;
  const hist = histOf(v.history);
  if (!VERDICTS.includes(v.verdict)) return hist.length ? {
    history: hist,
    ...(typeof v.at === 'string' && AT.test(v.at) ? {
      at: v.at
    } : {})
  } : null;
  const e = histItem(v);
  if (e && hist.length) e.history = hist;
  return e;
}
/** Une carte de verdicts lue d'ailleurs : seules les entrées aux règles (identifiant SOG-nnnn), 1000 au plus. */
export function cleanMap(m) {
  const out = {};
  if (!m || typeof m !== 'object' || Array.isArray(m)) return out;
  let n = 0;
  for (const k of Object.keys(m)) {
    const e = ID.test(k) && n < LIMITS.items ? entryOf(m[k]) : null;
    if (e) {
      out[k] = e;
      n++;
    }
  }
  return out;
}
/** Les verdicts d'un fichier du dépôt (texte, ou objet déjà lu) : { items, updated } aux règles ; rien (items vides) d'un fichier trop gros, d'un autre schéma ou illisible. */
export function readDoc(raw) {
  let d = raw;
  try {
    if (typeof raw === 'string') {
      if (bytes(raw) > READ_MAX) return {
        items: {},
        updated: ''
      };
      d = JSON.parse(raw);
    }
  } catch {
    return {
      items: {},
      updated: ''
    };
  }
  if (!d || typeof d !== 'object' || Array.isArray(d) || d.schema !== SCHEMA) return {
    items: {},
    updated: ''
  };
  // l'heure d'un verdict lu d'un fichier que tout pilote peut écrire est BORNÉE à maintenant + 24 h : une entrée datée de 2099 ne l'emporte jamais sur un vrai verdict (« le plus récent » se départage par l'heure)
  const cap = new Date(Date.now() + 864e5).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    cut = e => e && e.at && e.at > cap ? {
      ...e,
      at: cap
    } : e,
    items = cleanMap(d.items);
  for (const k of Object.keys(items)) {
    const e = cut(items[k]);
    items[k] = e.history ? {
      ...e,
      history: e.history.map(cut)
    } : e;
  }
  return {
    items,
    updated: typeof d.updated === 'string' && AT.test(d.updated) ? d.updated : ''
  };
}
/** Le fichier à écrire : le document de ces verdicts (triés par identifiant), ou null s'il dépasse les bornes. */
export function docOf(items, nowIso) {
  const clean = cleanMap(items),
    doc = {
      schema: SCHEMA,
      updated: AT.test(nowIso || '') ? nowIso : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      items: Object.fromEntries(Object.keys(clean).sort().map(k => [k, clean[k]]))
    };
  return bytes(JSON.stringify(doc)) <= LIMITS.doc ? doc : null;
}
/** JSON à clés triées : de quoi comparer deux entrées sans compter sur l'ordre de leurs clés. */
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v);
/** Les bornes d'une ÉCRITURE de l'adaptateur : seulement le fichier du trigramme de l'appareil, un document aux règles (rien n'est refusé en silence : { ok, why }). */
export function checkWrite(path, value, tri) {
  const want = pathOf(tri);
  if (!want || path !== want) return {
    ok: false,
    why: 'path'
  };
  let doc = value;
  try {
    if (typeof value === 'string') doc = JSON.parse(value);
  } catch {
    return {
      ok: false,
      why: 'shape'
    };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc) || doc.schema !== SCHEMA || !doc.items || typeof doc.items !== 'object' || Array
    .isArray(doc.items)) return {
    ok: false,
    why: 'shape'
  };
  if (Object.keys(doc).some(k => !['schema', 'updated', 'items'].includes(k)) || ('updated' in doc && !(typeof doc.updated === 'string' &&
      AT.test(doc.updated)))) return {
    ok: false,
    why: 'shape'
  };
  const keys = Object.keys(doc.items);
  if (keys.length > LIMITS.items) return {
    ok: false,
    why: 'size'
  };
  // chaque entrée doit être AUX RÈGLES telle quelle (rien n'est « nettoyé » en silence à l'écriture : un document hors règles est refusé)
  for (const k of keys) {
    const e = ID.test(k) ? entryOf(doc.items[k]) : null;
    if (!e || canon(e) !== canon(doc.items[k])) return {
      ok: false,
      why: 'entry'
    };
  }
  return bytes(JSON.stringify(doc)) <= LIMITS.doc ? {
    ok: true
  } : {
    ok: false,
    why: 'size'
  };
}
/** De deux entrées (celle du lanceur, celle du dépôt, celle de l'appareil…), la plus récente par son heure ; une entrée sans heure compte pour la plus ancienne. */
export function latest(...entries) {
  let best = null,
    bt = -1;
  for (const e of entries) {
    if (!e) continue;
    const t = e.at ? Date.parse(e.at) : 0;
    if (!best || t > bt) {
      best = e;
      bt = t;
    }
  }
  return best;
}
