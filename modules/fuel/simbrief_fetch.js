// V3 fuel — le dernier OFP SimBrief de l'identité (V3 § 10.20) : l'adresse de la demande (xml.fetcher.php, json=v2) et la lecture de la
// réponse. Sorti de loadSimbrief de module.js (règle « on extrait ce qu'on touche », SOG-0677), sans changer le comportement. Ce fichier
// n'appelle rien : l'appel passe par ctx.net (le cadre, le relais du lanceur) dans module.js.
//
// API : ofpUrl(id) → l'adresse (userid pour un identifiant tout en chiffres, username sinon) ; readAnswer(res, isOfp) → { offline } |
//   { ofp } | { error } (le texte que la ligne d'erreur cite : le statut de SimBrief, sinon le code HTTP) ; isOfp(ofp) : la forme d'un
//   OFP (shared/simbrief_ofp.js).

/** L'adresse du dernier OFP d'un utilisateur SimBrief (identifiant numérique : userid ; sinon : username). */
export const ofpUrl = id => `https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(id) ? 'userid' : 'username'}=${encodeURIComponent(id)}&json=v2`;

/** La réponse lue : hors ligne (le relais le dit), un OFP, ou ce que la ligne d'erreur cite. */
export async function readAnswer(res, isOfp) {
  if (res.headers.get('x-sog-offline')) return {
    offline: true
  };
  const ofp = res.ok ? await res.json().catch(() => null) : null;
  if (!ofp || !isOfp(ofp)) return {
    error: ofp?.fetch?.status || res.status
  };
  return {
    ofp
  };
}
