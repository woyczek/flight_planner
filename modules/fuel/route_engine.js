// V3 fuel — le calcul et le contrôle de route par le moteur RouteSim que le lanceur porte (SOG-0080, SOG-0081 ; AeroDB, travail
// route/compute dans « la forme de l'écran de Carburant », contrat : frame/aerodb/INTEGRATION.md « Route computation › The form of the
// Fuel screen »). La page ne calcule rien : elle envoie une demande fermée, puis lit une réponse qu'elle traite en entrée non fiable
// (bornée, nettoyée). La sorte d'un motif et le nom d'un itinéraire viennent du lanceur, qui lit les textes du moteur.
//
// API :
//   available(launcher) → Promise<boolean> : le lanceur connaît-il route/compute (regen/verbs) ; faux sans lanceur ou sans réponse.
//   request({ action, dep, arr, points, text, fl, date, depRunway, arrRunway }) → la demande (champs du contrat seulement, jamais
//     null) : compute = via, les points saisis entre les terrains (passages imposés, huit au plus) ; check = route, le texte saisi.
//   run(launcher, args) → Promise<object | null> : le résultat du travail, null sans réponse.
//   normalize(result, action) → { ok, reason, message, errors: [texte], plans: [plan], limitation, gaps: [{ name, reason }] } :
//     plan = { role ('primary' | 'alternative'), name, route, distanceNm, fl, accepted, errors: [texte], faults, sid, star,
//     segments: [{ from, to, via, state, reasons: [{ kind, text }] }] } ; trois itinéraires au plus, un seul en check.

export const VERB = 'route/compute';
const KINDS = ['RAD', 'FRA', 'direction', 'floor', 'ceiling', 'continuity', 'altitude'];

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

const text = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const ident = v => {
  const x = text(v, 12).toUpperCase();
  return /^[A-Z0-9]{1,12}$/.test(x) ? x : '';
};
const num = (v, lo, hi) => Number.isFinite(+v) && v !== null && v !== '' && +v >= lo && +v <= hi ? +v : null;

/** La demande fermée du contrat (voir l'en-tête) : un champ absent est omis, jamais envoyé vide ou null (le lanceur refuserait). */
export function request({
  action,
  dep,
  arr,
  points,
  text: typed,
  fl,
  date,
  depRunway,
  arrRunway
}) {
  const check = action === 'check',
    out = {
      action: check ? 'check' : 'compute',
      adep: ident(dep).slice(0, 4),
      adest: ident(arr).slice(0, 4),
      date: text(date, 25) || new Date().toISOString().slice(0, 16)
    };
  if (Number.isInteger(fl) && fl >= 10 && fl <= 660) out.fl = fl;
  if (/^[0-9]{2}[LRC]?$/.test(String(depRunway || ''))) out.rwyDep = String(depRunway);
  if (/^[0-9]{2}[LRC]?$/.test(String(arrRunway || ''))) out.rwyArr = String(arrRunway);
  if (check) out.route = text(typed, 600).toUpperCase();
  else {
    out.via = (Array.isArray(points) ? points : []).slice(1, -1).map(p => ident(p?.id)).filter(Boolean).slice(0, 8);
    out.alternatives = true;
  }
  return out;
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

/** Un tronçon de la réponse, borné : sa sorte prise dans la liste du contrat (sinon « altitude », comme le lanceur). */
function segOf(s) {
  return {
    from: ident(s?.from),
    to: ident(s?.to),
    via: text(s?.via, 16).toUpperCase(),
    state: s?.state === 'error' ? 'error' : 'ok',
    reasons: (Array.isArray(s?.reasons) ? s.reasons : []).slice(0, 5).map(x => ({
      kind: KINDS.includes(x?.kind) ? x.kind : 'altitude',
      text: text(x?.text, 200)
    })).filter(x => x.text)
  };
}
/** La procédure d'un côté (identifiant AeroDB « LFPO.SID.ELCOB2Q.RW24 », vérifié par sa forme) : { id, name } ou null. */
function procOf(p, kind) {
  const id = String(p?.id || '');
  return new RegExp(`^[A-Z0-9]{4}\\.${kind}\\.[A-Z0-9.]{1,60}$`).test(id) ? {
    id,
    name: text(p?.name, 20).toUpperCase()
  } : null;
}
/** Un itinéraire de la réponse, borné. */
function altOf(a, role, errors) {
  const segments = (Array.isArray(a?.segments) ? a.segments : []).slice(0, 800).map(segOf).filter(s => s.from && s.to),
    faults = Math.max(segments.filter(s => s.state === 'error').length, Math.round(num(a?.faults, 0, 999) || 0));
  return {
    role,
    name: text(a?.name, 60),
    route: text(a?.route, 800).toUpperCase().split(/\s+/).filter(t => /^[A-Z0-9/]{1,16}$/.test(t)).join(' '),
    distanceNm: num(a?.distanceNm, 0, 19999),
    fl: num(a?.fl, 0, 700) !== null ? Math.round(+a.fl) : null,
    accepted: !faults && !errors.length,
    errors,
    faults,
    sid: procOf(a?.sid, 'SID'),
    star: procOf(a?.star, 'STAR'),
    segments
  };
}

/** La réponse du travail, nettoyée (voir l'en-tête). Les erreurs du moteur (issues de niveau error) vont à la route saisie en check ;
 *  en compute, sans itinéraire possible, la première dit pourquoi. */
export function normalize(res, action = 'compute') {
  if (!res || res.ok !== true) return {
    ok: false,
    reason: ['invalid', 'no-rad', 'failed'].includes(res?.reason) ? res.reason : 'failed',
    message: text(res?.message, 300),
    errors: [],
    plans: [],
    limitation: '',
    gaps: []
  };
  const check = action === 'check',
    errors = (Array.isArray(res.issues) ? res.issues : []).slice(0, 300).filter(x => x?.level === 'error').map(x => text(x?.text, 300))
    .filter(Boolean).slice(0, 5),
    plans = (Array.isArray(res.alternatives) ? res.alternatives : []).slice(0, check ? 1 : 3)
    .map((a, i) => altOf(a, i ? 'alternative' : 'primary', check ? errors : []))
    .filter(p => p.route);
  return {
    ok: true,
    reason: '',
    message: !plans.length && errors[0] ? errors[0] : text(res.message, 300),
    errors,
    plans,
    limitation: text(res.limitation, 400),
    gaps: (Array.isArray(res.gaps) ? res.gaps : []).slice(0, 8).map(g => ({
      name: text(g?.name, 80),
      reason: text(g?.reason, 300)
    })).filter(g => g.name)
  };
}
