// V3 — les catégories de missions d'une compagnie (V3_SPECIFICATION § 10.38, SOG-0041). Pur : aucun accès au réseau ni au dépôt ; les lecteurs (Missions, Compte rendu, Réglages) lui donnent le
// contenu déjà lu de `data/airline/<code>/categories.json` et reçoivent des catégories propres. Un fichier de data/ est une entrée non fiable (§ 10.36) : tout ce qui entre est filtré,
// borné, rendu dans une forme fermée ; un nom est du texte à échapper par qui l'affiche.
//
// Forme du fichier (schema 1) :
//   { schema: 1, groups: [ { id, names: { fr, en, de, es }, kinds?: ['va', 'perso'], categories: [ { id, names: { fr, en, de, es }, load?: 'freight' | 'passengers' } ] } ], updated_at }
// Sans fichier, la base commune de la suite (BASE) est celle de toute compagnie et du « personnel » : `commercial` (fret, passagers, VIP, training, transit, essais en vol, positionnement)
// et `virtuel` (les catégories propres de la compagnie, vide au départ). Un groupe qui dit `kinds` n'est actif que pour une compagnie de ce genre (`settings.kind`, « personnel » : `perso`) ;
// sans `kinds`, il l'est pour toutes. `load` dit ce que le compte rendu d'un vol de la catégorie transporte (fret en kg, passagers) ; sans lui, rien n'est inventé.
export const LANGS = ['fr', 'en', 'de', 'es'];
export const LOADS = ['freight', 'passengers'];
export const KINDS = ['va', 'sog', 'perso'];
export const GROUPS_MAX = 6;
export const CATEGORIES_MAX = 40;
const ID = /^[a-z0-9][a-z0-9-]{0,23}$/;
const NAME_MAX = 40;
/** Un texte propre : une chaîne sans caractère de commande, rognée, bornée ; '' sinon. */
const text = v => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, NAME_MAX) : '';
/** Les noms d'une ligne dans les quatre langues : { fr, en, de, es } ; une langue manquante prend le nom français, à défaut l'identifiant ; null si aucun nom n'est lisible et aucun repli. */
function names(v, fallback) {
  const src = v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {},
    fr = Object.hasOwn(src, 'fr') ? text(src.fr) : '',
    out = {};
  for (const l of LANGS) out[l] = (Object.hasOwn(src, l) ? text(src[l]) : '') || fr || fallback;
  return out;
}
/** La base commune : les noms sont ceux de l'interface, jamais un texte d'une compagnie. */
export const BASE = Object.freeze({
  schema: 1,
  groups: [{
    id: 'commercial',
    names: {
      fr: 'Commercial',
      en: 'Commercial',
      de: 'Kommerziell',
      es: 'Comercial'
    },
    kinds: ['va', 'perso'],
    categories: [{
      id: 'fret',
      names: {
        fr: 'Fret',
        en: 'Cargo',
        de: 'Fracht',
        es: 'Carga'
      },
      load: 'freight'
    }, {
      id: 'passagers',
      names: {
        fr: 'Passagers',
        en: 'Passengers',
        de: 'Passagiere',
        es: 'Pasajeros'
      },
      load: 'passengers'
    }, {
      id: 'vip',
      names: {
        fr: 'VIP',
        en: 'VIP',
        de: 'VIP',
        es: 'VIP'
      },
      load: 'passengers'
    }, {
      id: 'training',
      names: {
        fr: 'Training',
        en: 'Training',
        de: 'Training',
        es: 'Entrenamiento'
      }
    }, {
      id: 'transit',
      names: {
        fr: 'Transit',
        en: 'Transit',
        de: 'Transit',
        es: 'Tránsito'
      }
    }, {
      id: 'essais-en-vol',
      names: {
        fr: 'Essais en vol',
        en: 'Test flights',
        de: 'Testflüge',
        es: 'Vuelos de prueba'
      }
    }, {
      id: 'positionnement',
      names: {
        fr: 'Positionnement',
        en: 'Positioning',
        de: 'Überführung',
        es: 'Posicionamiento'
      }
    }]
  }, {
    id: 'virtuel',
    names: {
      fr: 'Vos catégories',
      en: 'Your categories',
      de: 'Ihre Kategorien',
      es: 'Sus categorías'
    },
    categories: []
  }]
});
/** Une catégorie propre : { id, names, load? } ; null si son identifiant n'est pas de la forme permise. */
function cleanCategory(x) {
  const id = x !== null && typeof x === 'object' && typeof x.id === 'string' && ID.test(x.id) ? x.id : '';
  if (!id) return null;
  const out = {
    id,
    names: names(x.names, id)
  };
  if (LOADS.includes(x.load)) out.load = x.load;
  return out;
}
/** Un fichier lu (n'importe quoi) en { schema: 1, groups } propre : les groupes et catégories bien formés, sans doublon d'identifiant, bornés ; null si ce n'est pas un fichier de catégories
 *  (absent, autre forme) — l'appelant prend alors la base commune (forAirline le fait). Un groupe dont les genres (`kinds`) sont tous inconnus est écarté : il ne serait actif pour personne. */
export function clean(doc) {
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc) || !Array.isArray(doc.groups)) return null;
  const groups = [],
    seenGroup = new Set();
  let total = 0;
  for (const g of doc.groups.slice(0, GROUPS_MAX * 2)) {
    const id = g !== null && typeof g === 'object' && typeof g.id === 'string' && ID.test(g.id) ? g.id : '';
    if (!id || seenGroup.has(id) || groups.length >= GROUPS_MAX) continue;
    seenGroup.add(id);
    const out = {
      id,
      names: names(g.names, id),
      categories: []
    };
    if (Array.isArray(g.kinds)) {
      out.kinds = [...new Set(g.kinds.filter(k => KINDS.includes(k)))];
      if (!out.kinds.length) {
        seenGroup.delete(id);
        continue;
      }
    }
    const seen = new Set();
    for (const x of Array.isArray(g.categories) ? g.categories.slice(0, CATEGORIES_MAX * 2) : []) {
      const c = cleanCategory(x);
      if (!c || seen.has(c.id) || total >= CATEGORIES_MAX) continue;
      seen.add(c.id);
      out.categories.push(c);
      total++;
    }
    groups.push(out);
  }
  return {
    schema: 1,
    groups
  };
}
/** Le genre d'une compagnie pour les groupes : `perso` pour le « personnel », sinon son `settings.kind` (va | sog) ; '' s'il ne le dit pas (alors seuls les groupes sans `kinds` sont actifs). */
export function kindOf(airline) {
  if (airline?.code === 'perso') return 'perso';
  const k = airline?.settings?.kind;
  return typeof k === 'string' && KINDS.includes(k) ? k : '';
}
/** Les mots du genre d'une compagnie (ceux de Réglages › Compagnie, frame/settings/access.js) : une seule source pour qui le dit (SOG-0181). */
export const KIND_NAMES = Object.freeze({
  va: Object.freeze(['Commerciale', 'Commercial', 'Kommerziell', 'Comercial']),
  sog: Object.freeze(['Escadrille SO', 'SO squadron', 'SO-Staffel', 'Escuadrón SO']),
  perso: Object.freeze(['Personnel', 'Personal', 'Persönlich', 'Personal']),
  none: Object.freeze(['Genre à choisir', 'Kind to choose', 'Art wählen', 'Tipo por elegir'])
});
/** Une compagnie dite pour l'œil (SOG-0181) : « SO Group · Escadrille SO », « Rennes Motoculture · Commerciale », « Personnel » ; le nom
 *  seul quand le genre n'est pas dit ; '' sans nom ni code. `a` : { code, name, kind } (kind : va | sog | perso | ''). */
export function airlineText(a, lang) {
  const i = Math.max(0, LANGS.indexOf(lang)),
    kind = a?.code === 'perso' ? 'perso' : KINDS.includes(a?.kind) ? a.kind : '';
  if (kind === 'perso') return KIND_NAMES.perso[i];
  const name = text(a?.name) || text(a?.code);
  return name && kind ? `${name} · ${KIND_NAMES[kind][i]}` : name;
}
/** Les catégories d'une compagnie : ce que dit son fichier (clean), à défaut la base commune ; les groupes actifs pour son genre ; { groups: [{ id, names, categories }], all: [{ group, id, names, load? }] }
 *  (`all` : la liste à plat, dans l'ordre, pour un choix). `doc` : le contenu lu de categories.json (ou null) ; `airline` : { code, settings } de FrameData.airline(). */
export function forAirline(doc, airline) {
  const file = clean(doc) || clean(BASE),
    kind = kindOf(airline),
    groups = file.groups.filter(g => !g.kinds || (kind && g.kinds.includes(kind))),
    all = groups.flatMap(g => g.categories.map(c => ({
      group: g.id,
      ...c
    })));
  return {
    groups,
    all
  };
}
/** Le nom d'une catégorie dans la langue (fr, en, de, es) ; son identifiant si elle est inconnue de la liste (une mission peut citer une catégorie que la compagnie a retirée). */
export function nameOf(list, id, lang) {
  const c = (list?.all || []).find(x => x.id === id);
  return c ? c.names[LANGS.includes(lang) ? lang : 'fr'] : String(id ?? '');
}
