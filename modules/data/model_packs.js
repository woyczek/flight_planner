// V3 data — le calcul pur des paquets de pays (SPEC § 5.10, V3_SPECIFICATION § 10.42, SOG-0065) : la lecture fermée de ce que dit `ctx.aerodb.packs()` et ce qu'un paquet fait de la couverture du poste. Aucun accès à la page ni au dépôt ; tout ce que le lecteur donne est lu comme une
// entrée non fiable (listes fermées, textes courts, au plus soixante paquets). Contrat : packs() → { packs: [{ id, kind: 'region' | 'theme', names: [fr, en, de, es], zones: [ids], partial?: [ids], empty?: 'code', source?, date? }] }.
import {
  sizeKb
} from './model_update.js';

export const PACK_KINDS = Object.freeze(['region', 'theme']);
const PACK_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const ZONE_ID = /^[a-z0-9]{2,8}$/;
const PACKS_MAX = 60;
const ZONES_MAX = 300;
/** Un texte court sans caractère de commande ; '' sinon. */
const text = (v, n = 60) => typeof v === 'string' ? v.replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ').trim().slice(0, n) : '';
/** Les identifiants de zone d'une liste : ceux de la forme permise, sans doublon, bornés. */
const ids = v => [...new Set((Array.isArray(v) ? v : []).filter(z => typeof z === 'string' && ZONE_ID.test(z)))].slice(0, ZONES_MAX);
/** Les paquets lus : [{ id, kind, names: [4 textes], zones, partial (inclus dans zones), empty ('' ou un code court), source, date }], les paquets d'une autre forme écartés, sans doublon d'identifiant ; [] sans réponse lisible. */
export function packsOf(raw) {
  // la forme que livre AeroDb.packs() : { regions: [paquet], themes: [paquet] } (le genre est la liste) ; la forme convenue { packs: [{ kind, … }] } est lue aussi
  const o = raw !== null && typeof raw === 'object' ? raw : {},
    tag = (list, kind) => (Array.isArray(list) ? list : []).map(p => p !== null && typeof p === 'object' ? {
      ...p,
      kind: kind || p.kind
    } : p),
    list = [...tag(o.regions, 'region'), ...tag(o.themes, 'theme'), ...tag(o.packs, '')],
    out = [];
  for (const p of list.slice(0, PACKS_MAX * 4)) {
    const id = typeof p?.id === 'string' && PACK_ID.test(p.id) ? p.id : '',
      kind = PACK_KINDS.includes(p?.kind) ? p.kind : '';
    if (!id || !kind || out.some(o => o.id === id) || out.length >= PACKS_MAX) continue;
    const names = Array.isArray(p.names) ? p.names.map(n => text(n)) : [],
      fr = names[0] || id,
      zones = ids(p.zones);
    out.push({
      id,
      kind,
      names: [0, 1, 2, 3].map(i => names[i] || fr),
      zones,
      partial: ids(p.partial).filter(z => zones.includes(z)),
      empty: typeof p.empty === 'string' && /^[\w-]{1,40}$/.test(p.empty) ? p.empty : '',
      source: text(p.source),
      date: text(p.date, 20)
    });
  }
  return out;
}
/** Ce qu'un paquet est pour cette couverture : { known (ses zones que la suite connaît), unknown (celles qu'elle ne connaît pas : ignorées), inCoverage, toAdd (connues, pas encore dans la couverture), partial (nombre de ses zones « en partie »), size { kb, known, total } sur ses zones connues }.
 *  `zones` : zones() d'aerodb ([{ id, publishedKb }]) ; `covIds` : la couverture du poste. */
export function packState(pack, zones, covIds) {
  const have = new Set((Array.isArray(zones) ? zones : []).map(z => z?.id)),
    cov = new Set(covIds || []),
    known = pack.zones.filter(z => have.has(z));
  return {
    known,
    unknown: pack.zones.filter(z => !have.has(z)),
    inCoverage: known.filter(z => cov.has(z)),
    toAdd: known.filter(z => !cov.has(z)),
    partial: pack.partial.length,
    size: sizeKb(known, zones)
  };
}
