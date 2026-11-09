// V3 fuel — le calcul et le contrôle de route par le moteur RouteSim que le lanceur porte (SOG-0080, SOG-0081 ; AeroDB, travail
// route/compute). La page ne calcule rien : elle demande, puis lit une réponse qu'elle traite en entrée non fiable (bornée, nettoyée).
//
// API :
//   available(launcher) → Promise<boolean> : le lanceur connaît-il route/compute (regen/verbs) ; faux sans lanceur ou sans réponse.
//   run(launcher, args) → Promise<object | null> : le résultat du travail (args.action : 'compute' | 'check'), null sans réponse.
//   normalize(result) → { ok, alternatives: [alt], issues: [{ level, text }] } : alt = { id, name, route, distanceNm, fl, sid, star,
//     faults, segments: [{ from, to, via, state: 'ok' | 'error', reasons: [{ kind, text }] }] } ; sept itinéraires au plus.
//   via(points) → [ids] : les points saisis entre les deux terrains, passages imposés de « Calculer A → B ».

export const VERB = 'route/compute';
const KINDS = new Set(['RAD', 'FRA', 'direction', 'floor', 'ceiling', 'altitude', 'continuity']);

/** Le lanceur connaît-il le travail route/compute ? (regen/verbs, comme le module Données) */
export async function available(launcher) {
  if (typeof launcher?.call !== 'function' || typeof launcher?.job !== 'function') return false;
  try {
    const r = await launcher.call('regen/verbs');
    return Array.isArray(r?.verbs) && r.verbs.includes(VERB);
  } catch {
    return false;
  }
}

/** Un appel du travail route/compute ; le résultat ({ ok, … }) ou null. */
export async function run(launcher, args) {
  if (typeof launcher?.job !== 'function') return null;
  try {
    const r = await launcher.job('regen/job', {
      set: 'route',
      verb: 'compute',
      args
    });
    return r?.result && typeof r.result === 'object' ? r.result : null;
  } catch {
    return null;
  }
}

const text = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const ident = v => {
  const x = text(v, 12).toUpperCase();
  return /^[A-Z0-9]{1,12}$/.test(x) ? x : '';
};
const numOr = (v, lo, hi) => Number.isFinite(+v) && +v >= lo && +v <= hi ? +v : null;
/** Une procédure de la réponse : { id (identifiant aerodb, vérifié plus tard contre les fiches du terrain), name } ou null. */
const procOf = p => p && typeof p === 'object' ? {
  id: /^[A-Z0-9]{4}\.(SID|STAR)\.[A-Z0-9.]{1,60}$/.test(String(p.id || '')) ? String(p.id) : '',
  name: text(p.name, 20).toUpperCase()
} : null;
/** Un segment de la réponse, borné. */
function segOf(s) {
  const reasons = (Array.isArray(s?.reasons) ? s.reasons : []).slice(0, 5).map(x => ({
    kind: KINDS.has(x?.kind) ? x.kind : 'continuity',
    text: text(x?.text, 200)
  })).filter(x => x.text);
  return {
    from: ident(s?.from),
    to: ident(s?.to),
    via: text(s?.via, 12).toUpperCase(),
    state: s?.state === 'error' ? 'error' : 'ok',
    reasons
  };
}

/** La réponse du travail, nettoyée (voir l'en-tête). */
export function normalize(res) {
  const alts = (Array.isArray(res?.alternatives) ? res.alternatives : []).slice(0, 7).map((a, i) => {
    const segments = (Array.isArray(a?.segments) ? a.segments : []).slice(0, 300).map(segOf).filter(s => s.from && s.to),
      route = text(a?.route, 800).toUpperCase().split(/\s+/).filter(t => /^[A-Z0-9/]{1,16}$/.test(t)).join(' ');
    return {
      id: text(a?.id, 40) || String(i + 1),
      name: text(a?.name, 60) || String(i + 1),
      route,
      distanceNm: numOr(a?.distanceNm, 0, 20000),
      fl: numOr(a?.fl, 0, 700),
      sid: procOf(a?.sid),
      star: procOf(a?.star),
      segments,
      faults: segments.filter(s => s.state === 'error').length
    };
  }).filter(a => a.route);
  return {
    ok: res?.ok === true,
    alternatives: alts,
    issues: (Array.isArray(res?.issues) ? res.issues : []).slice(0, 20).map(x => ({
      level: x?.level === 'error' ? 'error' : 'review',
      text: text(x?.text, 300)
    })).filter(x => x.text)
  };
}

/** Les points saisis entre les deux terrains (les passages imposés de « Calculer A → B »), leurs identifiants. */
export const via = points => (Array.isArray(points) ? points : []).slice(1, -1).map(p => ident(p?.id)).filter(Boolean).slice(0, 40);
