// V3 fuel — le calcul et le contrôle de route par le moteur RouteSim que le lanceur porte (SOG-0080, SOG-0081 ; AeroDB, travail
// route/compute, contrat : frame/aerodb/INTEGRATION.md « Route computation »). La page ne calcule rien : elle envoie une demande fermée,
// puis lit une réponse qu'elle traite en entrée non fiable (bornée, nettoyée).
//
// API :
//   available(launcher) → Promise<boolean> : le lanceur connaît-il route/compute (regen/verbs) ; faux sans lanceur ou sans réponse.
//   request({ mode, dep, arr, points, text, fl, date, depRunway, arrRunway }) → la demande (champs du contrat seulement, jamais null) :
//     calculate : route = départ, points saisis entre les terrains (passages imposés), arrivée ; validate : la route saisie telle quelle.
//   run(launcher, args) → Promise<object | null> : le résultat du travail, null sans réponse.
//   normalize(result, mode) → { ok, reason, message, plans: [plan], limitation, gaps: [{ name, reason }] } : plan = { role ('primary' |
//     'alternative'), route, distanceNm, fl, accepted, faults, errors: [texte], sid, star, segments: [{ from, to, via, state, reasons:
//     [{ kind, text }] }] } ; le primaire puis trois variantes au plus (une seule ligne en validate).

export const VERB = 'route/compute';

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

/** La demande fermée du contrat (voir l'en-tête) : un champ absent est omis, jamais envoyé vide ou null (le lanceur refuserait). */
export function request({
  mode,
  dep,
  arr,
  points,
  text: typed,
  fl,
  date,
  depRunway,
  arrRunway
}) {
  const D = ident(dep).slice(0, 4),
    A = ident(arr).slice(0, 4),
    via = (Array.isArray(points) ? points : []).slice(1, -1).map(p => ident(p?.id)).filter(Boolean).slice(0, 40),
    route = mode === 'validate' ? text(typed, 600).toUpperCase() : [D, ...via, A].filter(Boolean).join(' ').slice(0, 600),
    out = {
      dep: D,
      arr: A,
      route,
      mode: mode === 'validate' ? 'validate' : 'calculate',
      date: text(date, 25) || new Date().toISOString().slice(0, 16),
      use_procedures: true
    };
  if (Number.isInteger(fl) && fl >= 10 && fl <= 660) out.fl = fl;
  if (/^[0-9]{2}[LRC]?$/.test(String(depRunway || ''))) out.dep_runway = String(depRunway);
  if (/^[0-9]{2}[LRC]?$/.test(String(arrRunway || ''))) out.arr_runway = String(arrRunway);
  if (out.mode === 'calculate') out.alternatives = true;
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

/** La sorte d'un motif de segment, d'après son texte (RAD, FRA, plancher, plafond, sens ; sinon altitude pour un écart vertical,
 *  continuité pour le reste). */
function kindOf(s, vertical) {
  if (/\bRAD\b/i.test(s)) return 'RAD';
  if (/\bFRA\b/i.test(s)) return 'FRA';
  if (/plafond|ceiling|upper/i.test(s)) return 'ceiling';
  if (/plancher|floor|lower/i.test(s)) return 'floor';
  if (/sens|direction/i.test(s)) return 'direction';
  return vertical ? 'altitude' : 'continuity';
}
/** Un segment (leg) du plan, borné : fautif quand compatible vaut false, ses motifs exacts (alerts, vertical_errors). */
function segOf(l) {
  const reasons = [...(Array.isArray(l?.alerts) ? l.alerts : []).map(x => [x, false]), ...(Array.isArray(l?.vertical_errors) ? l
      .vertical_errors : [])
    .map(x => [x, true])
  ].slice(0, 5).map(([x, v]) => {
    const t = text(x, 200);
    return {
      kind: kindOf(t, v),
      text: t
    };
  }).filter(x => x.text);
  return {
    from: ident(l?.start?.id),
    to: ident(l?.end?.id),
    via: text(l?.via, 16).toUpperCase(),
    state: l?.compatible === false ? 'error' : 'ok',
    reasons
  };
}
/** La procédure d'un côté, d'après le procedure_id des segments (« LFPO.SID.ELCOB2Q.RW24.NONE ») : { id, name } ou null. */
function procOf(legs, kind) {
  const l = legs.find(x => new RegExp(`^[A-Z0-9]{4}\\.${kind}\\.`).test(String(x?.procedure_id || '')));
  return l && /^[A-Z0-9]{4}\.(SID|STAR)\.[A-Z0-9.]{1,60}$/.test(String(l.procedure_id)) ? {
    id: String(l.procedure_id),
    name: text(l.procedure_name, 20).toUpperCase()
  } : null;
}
/** Un plan du moteur (primary ou une variante), borné. */
function planOf(p, role) {
  const legs = (Array.isArray(p?.legs) ? p.legs : []).slice(0, 800),
    segments = legs.map(segOf).filter(s => s.from && s.to),
    issues = (Array.isArray(p?.issues) ? p.issues : []).slice(0, 300),
    errors = issues.filter(x => x?.level === 'ERREUR').map(x => text(x?.text, 300)).filter(Boolean),
    maxFt = Number.isFinite(+p?.profile?.max_altitude_ft) ? +p.profile.max_altitude_ft : null,
    route = text(p?.route, 800).toUpperCase().split(/\s+/).filter(t => /^[A-Z0-9/]{1,16}$/.test(t)).join(' ');
  return {
    role,
    route,
    distanceNm: Number.isFinite(+p?.distance_nm) && +p.distance_nm >= 0 && +p.distance_nm < 20000 ? +p.distance_nm : null,
    fl: maxFt !== null && maxFt > 0 && maxFt < 70000 ? Math.round(maxFt / 100) : Number.isFinite(+p?.fl) ? Math.round(+p.fl) : null,
    accepted: p?.ok === true && !errors.length,
    calcError: p?.ok === false ? text(p?.error || p?.status, 300) : '',
    errors: errors.slice(0, 5),
    faults: segments.filter(s => s.state === 'error').length,
    sid: procOf(legs, 'SID'),
    star: procOf(legs, 'STAR'),
    segments
  };
}

/** La réponse du travail, nettoyée (voir l'en-tête). */
export function normalize(res, mode = 'calculate') {
  if (!res || res.ok !== true) return {
    ok: false,
    reason: ['invalid', 'no-rad', 'failed'].includes(res?.reason) ? res.reason : 'failed',
    message: text(res?.message, 300),
    plans: [],
    limitation: '',
    gaps: []
  };
  const plan = res.plan || {},
    primary = plan.primary ? planOf(plan.primary, 'primary') : null,
    alts = mode === 'validate' ? [] : (Array.isArray(plan.alternatives) ? plan.alternatives : []).slice(0, 3).map(p => planOf(p,
      'alternative'));
  return {
    ok: true,
    reason: '',
    message: text(plan.alternative_message, 300),
    plans: [primary, ...alts].filter(p => p && (p.route || p.calcError)),
    limitation: text(plan.primary?.limitation, 400),
    gaps: (Array.isArray(plan.primary?.gaps) ? plan.primary.gaps : []).slice(0, 8).map(g => ({
      name: text(g?.name, 80),
      reason: text(g?.reason, 300)
    })).filter(g => g.name)
  };
}
