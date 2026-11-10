// V3 frame/lib (propriétaire : Features SOG) — une compagnie dite pour l'œil : son genre (va | sog | perso) et ses mots ×4 (SOG-0181),
// sortis de mission_categories.js par SOG-0202 T1 (V3_SPECIFICATION § 10.48) ; mission_categories.js les ré-exporte jusqu'à T5. Pur : ni
// page, ni stockage, ni réseau ; un nom est du texte à échapper par qui l'affiche.
export const LANGS = ['fr', 'en', 'de', 'es'];
export const KINDS = ['va', 'sog', 'perso'];
const NAME_MAX = 40;
const text = v => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, NAME_MAX) : '';
/** Le genre d'une compagnie : `perso` pour le « personnel », sinon son `settings.kind` (va | sog) ; '' s'il ne le dit pas. */
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
