// V3 fuel — le dernier OFP SimBrief de l'identité (V3 § 10.20) : l'adresse de la demande (xml.fetcher.php, json=v2) et la lecture de la
// réponse. Sorti de loadSimbrief de module.js (règle « on extrait ce qu'on touche », SOG-0677), sans changer le comportement. Ce fichier
// n'appelle rien : l'appel passe par ctx.net (le cadre, le relais du lanceur) dans module.js.
//
// API : ofpUrl(id) → l'adresse (userid pour un identifiant tout en chiffres, username sinon) ; readAnswer(res, isOfp) → { offline } |
//   { ofp } | { e } (le texte que la ligne d'erreur cite : le statut de SimBrief, sinon le code HTTP) | { say, vars } (SOG-0677 : une
//   réponse d'erreur lue, la rangée de TX qui dit sa cause et ses valeurs) ; isOfp(ofp) : la forme d'un OFP (shared/simbrief_ofp.js).
//   TX : les textes (français seul depuis le 26/11, SOG-0680).

export const TX = {
  // SOG-0677 (l'ergonome, 26/11) : SimBrief a répondu, par une erreur ; sa cause dite, jamais « n'a pas répondu »
  sbNoPlan: ['SimBrief n’a aucun plan pour l’utilisateur {id} : générez un plan sur SimBrief, puis recommencez.'],
  sbUnknownUser: ['SimBrief ne connaît pas l’utilisateur {id} : vérifiez votre identifiant SimBrief dans les Réglages.'],
  sbRefused: ['SimBrief a refusé la demande (HTTP {code}) : {s}.'],
  sbHttp: ['SimBrief a répondu par une erreur (HTTP {code}).']
};

/** SOG-0677 : le statut d'une réponse de SimBrief (fetch.status, une entrée non fiable) — une ligne, sans signe de contrôle, 120 signes
 *  au plus, sans ponctuation finale (la phrase met la sienne) ; '' sans lui. */
const statusOf = v => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 120).replace(/[\s.!;:,]+$/, '') :
  '';

/** L'adresse du dernier OFP d'un utilisateur SimBrief (identifiant numérique : userid ; sinon : username). */
export const ofpUrl = id => `https://www.simbrief.com/api/xml.fetcher.php?${/^\d+$/.test(id) ? 'userid' : 'username'}=${encodeURIComponent(id)}&json=v2`;

/** La réponse lue : hors ligne (le relais le dit), un OFP, ou ce que la ligne d'erreur cite ; SOG-0677 : une réponse en erreur (HTTP 400 :
 *  xml.fetcher.php dit pourquoi dans fetch.status) est lue elle aussi — pas de plan, utilisateur inconnu (les statuts de SimBrief, reconnus
 *  à leurs mots), tout autre statut cité tel quel avec son code, aucun statut lisible : son code. id : l'identifiant demandé (la phrase le
 *  nomme). */
export async function readAnswer(res, isOfp, id = '') {
  if (res.headers.get('x-sog-offline')) return {
    offline: true
  };
  if (!res.ok) {
    const body = await res.json().catch(() => null),
      st = statusOf(body?.fetch?.status),
      who = String(id || '').slice(0, 40);
    if (/no flight plan/i.test(st)) return {
      say: TX.sbNoPlan,
      vars: {
        id: who
      }
    };
    if (/unknown\s*(user\s*id|userid|username|user)|user\s*not\s*found/i.test(st)) return {
      say: TX.sbUnknownUser,
      vars: {
        id: who
      }
    };
    return st ? {
      say: TX.sbRefused,
      vars: {
        code: String(res.status),
        s: st
      }
    } : {
      say: TX.sbHttp,
      vars: {
        code: String(res.status)
      }
    };
  }
  const ofp = await res.json().catch(() => null);
  if (!ofp || !isOfp(ofp)) return {
    e: ofp?.fetch?.status || res.status
  };
  return {
    ofp
  };
}
