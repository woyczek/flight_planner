// V3 frame/lib — les propositions en cours (SOG-0224) : LA règle de péremption, partagée par Carburant (qui garde l'objet) et la Carte (qui le montre) ;
// fuel INTEGRATION § 3 bis. Une seule fonction : jamais deux règles qui se contredisent.
//
// API : baseStampOf(status), natRoute(answer), isStale(R, stamp, now), ageOfComputation(R).

import {
  airacOf
} from './fms.js';

/** Le tampon de la base aéronautique d'après son état (AeroDb.status().published : les cycles publiés de chaque zone) : un condensé court (FNV-1a, hex), '' quand la base
 *  ne le dit pas. Changé, le calcul est périmé. */
export function baseStampOf(status) {
  const txt = status?.published ? JSON.stringify(Object.entries(status.published).sort()) : '';
  if (!txt) return '';
  let h = 0x811c9dc5;
  for (let i = 0; i < txt.length; i++) h = Math.imul(h ^ txt.charCodeAt(i), 16777619) >>> 0;
  return h.toString(16);
}
/** Un itinéraire de la réponse passe-t-il par les NAT (routes du jour) ? — `nat` posé par le moteur sur l'itinéraire ou un tronçon (SOG-0263), ou une voie « NAT… ». */
export function natRoute(answer) {
  return (answer?.alternatives || []).some(a => a?.nat || (Array.isArray(a?.segments) ? a.segments : []).some(g => g?.nat || /^NAT/i.test(
    String(g?.via || ''))));
}
/** La règle de l'utilisateur (« un cache, qui périme uniquement au changement d'airac, ou s'il passe par les nats »), arrêtée par l'ergonome le 13/11 : périmé quand le cycle AIRAC a changé
 *  depuis le calcul, quand la base a changé (son tampon : R.base différent de stamp, tous deux dits), ou, pour une route par les NAT, le jour suivant (UTC) ; jamais à cause de l'âge seul.
 *  R : { computed_at, base, answer } (le document `route_alts.json`, schéma 2) ; stamp : le tampon de la base d'aujourd'hui ('' : inconnu) ; now : l'heure. */
export function isStale(R, stamp = '', now = new Date()) {
  if (!R?.computed_at) return false;
  const t = new Date(R.computed_at);
  if (!Number.isFinite(t.getTime())) return false;
  return airacOf(t) !== airacOf(now) || !!(R.base && stamp && stamp !== R.base) || natRoute(R.answer) && String(R.computed_at).slice(0,
    10) !== now.toISOString().slice(0, 10);
}
