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
//   normalize(result, action, asked) → { ok, reason, message, errors: [texte], plans: [plan], limitation, gaps: [{ name, reason }],
//     level } : level = { fl, basis: 'request' | 'default' } (SOG-0389 : le niveau du calcul et d'où il vient — sections.fl / fl_basis
//     du moteur d'abord, puis `level` d'une réponse gardée, puis la demande `asked` : sans `fl`, le niveau par défaut du moteur) ou null ;
//     plan = { role ('primary' | 'alternative'), name, route, distanceNm, fl, accepted, errors: [texte], faults, sid, star,
//     segments: [{ from, to, via, state, reasons: [{ kind, text, ruleId }] }] } ; trois itinéraires au plus, un seul en check.
//   Un itinéraire au contrôle incomplet faute de données (RouteSim du 9 nov. 17 h 05 : incomplete: true, ses raisons dans les issues
//     « revue ») porte incomplete et reviews (les raisons, en check seulement : celles de la route contrôlée) ; il n'est jamais accepted.
//   Le contrôle par tronçon et par couche (SOG-0161, AeroDB « la plus longue route contrôlée ») : un plan porte control { controlledPct,
//     incompletePct, fallbackPct, errorPct, sections: [{ layer, control, from, to, nm, reason }] } (ou null), un segment control, layer,
//     controlReason ; control vaut controlled | incomplete | fallback | error, layer SID | LOW | HIGH | FRA | STAR | APP.
//   faultLines(plan) → [{ seg: 'FROM–TO' | '', kind, ruleId, text }] : un écart par ligne (SOG-0134) — chaque motif d'un segment fautif,
//     un segment fautif sans motif, puis les erreurs du moteur qu'aucun motif ne dit déjà (seg vide).

export const VERB = 'route/compute';
/** SOG-0390 : un mot du texte de route rendu par le lanceur — identifiant, point NAT (« 54/50 »), ou nom de voie COMPOSÉ, lettres et
 *  chiffres reliés par des tirets (« N71B-N90B », les voies nord-américaines : quatre parts au plus) ; 24 signes au plus ; le reste
 *  est écarté. Le champ Route lit la voie composée (route_model AIRWAY_WORD). */
export const ROUTE_WORD = /^(?:[A-Z0-9/]{1,16}|[A-Z]{1,2}\d{1,4}[A-Z]?(?:-[A-Z]{1,2}\d{1,4}[A-Z]?){1,3})$/;
/** Le texte de route du lanceur, mot à mot (ROUTE_WORD), en majuscules, `max` signes au plus. */
export const routeWords = (v, max = 800) => String(v ?? '').toUpperCase().split(/\s+/).filter(t => t.length <= 24 && ROUTE_WORD.test(t))
  .join(' ').slice(0, max);
const KINDS = ['RAD', 'FRA', 'direction', 'floor', 'ceiling', 'continuity', 'altitude'];
export const CONTROLS = ['controlled', 'incomplete', 'fallback', 'error'];
export const LAYERS = ['SID', 'LOW', 'HIGH', 'FRA', 'STAR', 'APP'];

/** Le lanceur connaît-il le travail route/compute ? (regen/verbs, comme le module Données) */
/** Le lanceur répond-il encore, à l'instant d'un appui (SOG-0208) : available, borné à `ms` (un lanceur arrêté ne laisse pas l'appui
 *  sans suite) ; faux sans lanceur, sans réponse ou sans le verbe. */
export function answers(launcher, ms = 4000) {
  return Promise.race([available(launcher), new Promise(res => setTimeout(() => res(false), ms))]);
}
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
/** SOG-0296 : ce que la réponse dit de son cache (AeroDB, `cache: { hit, computedAt, until }`) — { hit: true, at: ISO } quand le résultat
 *  vient du cache du poste, null sinon (une entrée non fiable : seule une date lisible passe). */
const cacheOf = c => c && typeof c === 'object' && c.hit === true && Number.isFinite(Date.parse(c.computedAt)) ? {
  hit: true,
  at: new Date(Date.parse(c.computedAt)).toISOString()
} : null;
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
  arrRunway,
  alternatives = true,
  sections = false
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
  if (check) {
    // SOG-0380 : le mot « aérodrome/piste » du champ (« LFPO/02 », SOG-0089) n'est pas un point pour le moteur (« Point inconnu dans AeroDB :
    // LFPO/02 ») : le départ ou l'arrivée seul dans le texte, sa piste dans son champ quand aucune n'est choisie ; un autre terrain intact
    const words = text(typed, 600).toUpperCase().split(/\s+/).filter(Boolean);
    out.route = words.map(w => {
      const m = /^([A-Z]{4})\/([0-9]{2}[LRC]?)$/.exec(w);
      if (!m || (m[1] !== out.adep && m[1] !== out.adest)) return w;
      const k = m[1] === out.adep && (w === words[0] || m[1] !== out.adest) ? 'rwyDep' : 'rwyArr';
      if (!out[k]) out[k] = m[2];
      return m[1];
    }).join(' ');
  } else {
    out.via = (Array.isArray(points) ? points : []).slice(1, -1).map(p => ident(p?.id)).filter(Boolean).slice(0, 8);
    // SOG-0296 : la première demande sans variantes (la route de tête en 1 à 3 s), la seconde avec
    if (alternatives) out.alternatives = true;
    out.proposals = true; // un plan impossible rend les propositions de repli du moteur, marquées proposal (AeroDB 9a7f1dde3, SOG-0161)
    // SOG-0354 (L2b 3, AeroDB 39e81766c) : un vol qui traverse l'océan demande le découpage par sections (route NAT du jour publiée,
    // sections calculées de part et d'autre) ; le moteur rend view.sections, null quand l'option ne s'applique pas
    if (sections === true) out.sections = true;
  }
  return out;
}

/** Un appel du travail route/compute ; le résultat ({ ok, … }), ou, sans résultat, la RAISON dite (SOG-0206 : « le contrôle n'a pas répondu »
 *  sans cause) : { ok: false, reason: 'busy' (un autre travail du poste tourne : 409), 'offline' (lanceur injoignable), 'stopped' (travail
 *  arrêté ou interrompu), 'failed' (le travail a échoué sans résultat) } ; null sans lanceur (rien n'a été demandé). */
export async function run(launcher, args, {
  signal
} = {}) {
  if (typeof launcher?.job !== 'function') return null;
  try {
    // SOG-0296 : `signal` arrête le travail (regen/job/cancel) : la seconde demande, quand l'entrée change
    const r = await launcher.job('regen/job', {
      set: 'route',
      verb: 'compute',
      args
    }, signal ? {
      signal
    } : undefined);
    if (r?.result && typeof r.result === 'object') return r.result;
    const reason = r?.status === 409 ? 'busy' : r?.offline ? 'offline' : r?.cancelled || ['cancelled', 'interrupted'].includes(r?.state) ?
      'stopped' : 'failed';
    return {
      ok: false,
      reason
    };
  } catch {
    return {
      ok: false,
      reason: 'offline'
    };
  }
}

/** Un tronçon de la réponse, borné : sa sorte prise dans la liste du contrat (sinon « altitude », comme le lanceur). */
function segOf(s) {
  return {
    from: ident(s?.from),
    to: ident(s?.to),
    via: text(s?.via, 24).toUpperCase(), // SOG-0390 : une voie composée tient
    state: s?.state === 'error' ? 'error' : 'ok',
    control: CONTROLS.includes(s?.control) ? s.control : '',
    layer: LAYERS.includes(s?.layer) ? s.layer : '',
    controlReason: text(s?.controlReason, 200),
    reasons: (Array.isArray(s?.reasons) ? s.reasons : []).slice(0, 5).map(x => ({
      kind: KINDS.includes(x?.kind) ? x.kind : 'altitude',
      text: text(x?.text, 200),
      // la règle du livre RAD (ou d'un point FRA) : un identifiant court, rien d'autre (entrée non fiable)
      ruleId: /^[A-Z0-9][A-Z0-9_./-]{0,23}$/i.test(String(x?.ruleId ?? '')) ? String(x.ruleId).toUpperCase() : ''
    })).filter(x => x.text)
  };
}
/** Les écarts d'un itinéraire, un par ligne (voir l'en-tête) ; 200 au plus. */
export function faultLines(plan) {
  const out = [],
    said = new Set();
  for (const sg of plan?.segments || []) {
    if (sg.state !== 'error') continue;
    const seg = `${sg.from}–${sg.to}`;
    if (!sg.reasons.length) out.push({
      seg,
      kind: '',
      ruleId: '',
      text: ''
    });
    for (const r of sg.reasons) {
      said.add(r.text);
      out.push({
        seg,
        kind: r.kind,
        ruleId: r.ruleId,
        text: r.text
      });
    }
  }
  for (const e of plan?.errors || [])
    if (!said.has(e) && ![...said].some(t => e.includes(t) || t.includes(e))) out.push({
      seg: '',
      kind: '',
      ruleId: '',
      text: e
    });
  return out.slice(0, 200);
}
/** La procédure d'un côté (identifiant AeroDB « LFPO.SID.ELCOB2Q.RW24 », vérifié par sa forme) : { id, name } ou null. */
function procOf(p, kind) {
  const id = String(p?.id || '');
  return new RegExp(`^[A-Z0-9]{4}\\.${kind}\\.[A-Z0-9.]{1,60}$`).test(id) ? {
    id,
    name: text(p?.name, 20).toUpperCase()
  } : null;
}
/** Le contrôle d'un itinéraire (voir l'en-tête), borné : des pourcentages de 0 à 100, cinquante tronçons au plus ; null sans contrôle. */
function controlOf(c) {
  if (!c || typeof c !== 'object') return null;
  const pct = v => num(v, 0, 100) !== null ? Math.round(+v) : 0;
  return {
    controlledPct: pct(c.controlledPct),
    incompletePct: pct(c.incompletePct),
    fallbackPct: pct(c.fallbackPct),
    errorPct: pct(c.errorPct),
    sections: (Array.isArray(c.sections) ? c.sections : []).slice(0, 50).map(x => ({
      layer: LAYERS.includes(x?.layer) ? x.layer : '',
      control: CONTROLS.includes(x?.control) ? x.control : '',
      from: ident(x?.from),
      to: ident(x?.to),
      nm: num(x?.nm, 0, 20000) !== null ? Math.round(+x.nm) : null,
      reason: text(x?.reason, 200)
    })).filter(x => x.control)
  };
}
/** SOG-0263 : les routes NAT d'un itinéraire (view.nat_of du moteur) : { tracks: ['A'], issued: 'JJ/MM' | '', stale } ; null sans
 *  track. Lettres de track seules (une ou deux capitales, six au plus), date à sa forme, périmée seulement si vrai. */
/** SOG-0354 (L2b 3 et suite, AeroDB) : le découpage de la réponse (`sections` de la vue d'AeroDB : { candidates, tried, chosen, cost,
 *  source, free, rejected, depart, sections: [{ name, from, to, nm, cost, expanded, seconds, proof }] }, null sans l'option), lu comme une
 *  entrée non sûre — propriétés propres ; six sections au plus, la preuve « published », « computed » ou « created » (la route libre créée
 *  quand aucune route NAT du jour ne convient) seulement (une autre : la section est écartée), extrémités par motif, distance bornée, la
 *  lettre de la route NAT tirée du nom « track E » d'une section publiée ; les routes NAT écartées et pourquoi (`rejected` : six au plus,
 *  lettre par motif, phrase bornée à 160 signes, sans caractère de commande ni marque de format ; un « route NAT E : » en tête retiré, la
 *  page le dit) ; l'heure de départ absente de la demande (`depart.basis` = 'none' : la validité horaire des routes NAT n'a pas été vérifiée ;
 *  'request' sinon). Chaque route écartée garde son code (`direction`, `level`, `time`, `rad`, `network` ; '' sinon) et les niveaux
 *  qu'elle offre (SOG-0389 : `levels`, entiers de FL10 à FL660, vingt au plus, triés). { list, rejected, noTime } ; null sans rien. */
const REJ_CODES = ['direction', 'level', 'time', 'rad', 'network'];
/** SOG-0391 (b) : une heure UTC du moteur (« 2026-11-17T13:32Z », secondes et fraction admises) ou de la demande (« 2026-11-17T07:57 »,
 *  l'heure UTC de toISOString) ramenée à la minute, « AAAA-MM-JJTHH:MMZ » ; '' pour toute autre forme (un décalage horaire compris). */
export function isoMinute(v) {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::\d{2}(?:\.\d{1,6})?)?Z?$/.exec(text(v, 32));
  return m && Number.isFinite(Date.parse(`${m[1]}Z`)) ? `${m[1]}Z` : '';
}

/** SOG-0391 (b) : les champs de l'heure d'une route NAT écartée pour l'HEURE ou, SOG-0391 (b bis), pour le NIVEAU (AeroDB, champs de (a))
 *  — `at` (le passage de son entrée), `entry` (le point), `from` / `to` (la fenêtre du message) — lus comme une entrée non sûre ; rien pour
 *  un autre code. */
function timeOf(x) {
  const own = k => x && typeof x === 'object' && !Array.isArray(x) && Object.hasOwn(x, k) ? x[k] : undefined;
  if (own('code') !== 'time' && own('code') !== 'level') return {};
  const id = text(own('entry'), 12).toUpperCase();
  return {
    at: isoMinute(own('at')),
    entry: PT_ID.test(id) ? id : '',
    from: isoMinute(own('from')),
    to: isoMinute(own('to'))
  };
}

function proofOf(v) {
  const own = (o, k) => o && typeof o === 'object' && !Array.isArray(o) && Object.hasOwn(o, k) ? o[k] : undefined,
    list = own(v, 'sections');
  if (!own(v, 'sections') && !own(v, 'rejected')) return null;
  const end = x => {
      const t = text(x, 12).toUpperCase();
      return PT_ID.test(t) ? t : '';
    },
    out = [];
  for (const x of Array.isArray(list) ? list.slice(0, 6) : []) {
    const proof = own(x, 'proof'),
      from = end(own(x, 'from')),
      to = end(own(x, 'to'));
    if (!['published', 'computed', 'created'].includes(proof) || !from || !to) continue;
    const m = /^track\s+([A-Z]{1,2})$/i.exec(text(own(x, 'name'), 20));
    out.push({
      from,
      to,
      nm: num(own(x, 'nm'), 0, 20000),
      proof,
      track: proof === 'published' && m ? m[1].toUpperCase() : ''
    });
  }
  const rej = own(v, 'rejected'),
    raw = (Array.isArray(rej) ? rej : []).slice(0, 40),
    rejected = raw.slice(0, 6).map(x => {
      const t = text(own(x, 'track'), 4).toUpperCase(),
        why = text(own(x, 'text'), 160).replace(/\p{Cf}/gu, '').replace(/^route\s+NAT\s+[A-Z]{1,2}\s*:\s*/i, '').trim();
      const code = own(x, 'code'),
        lv = own(x, 'levels');
      return /^[A-Z]{1,2}$/.test(t) && why ? {
        track: t,
        why,
        code: REJ_CODES.includes(code) ? code : '',
        levels: [...new Set((Array.isArray(lv) ? lv : []).slice(0, 40).filter(n => Number.isInteger(n) && n >= 10 && n <= 660))]
          .sort((a, b) => a - b).slice(0, 20),
        ...timeOf(x)
      } : null;
    }).filter(Boolean),
    noTime = own(own(v, 'depart'), 'basis') === 'none',
    // SOG-0391 (b) : l'entrée de l'océan de la route PRISE (`sections.entry` : point et heure estimée ; rien sans heure de départ)
    en = own(v, 'entry'),
    entry = isoMinute(own(en, 'time')) ? {
      point: end(own(en, 'point')),
      time: isoMinute(own(en, 'time'))
    } : null,
    // SOG-0391 (b) : la cause, comptée sur toutes les routes écartées (quarante au plus) — l'heure, le niveau, le sens ; l'heure de passage
    // la plus tôt et la fenêtre du message, lues dans les champs des routes écartées pour l'heure, jamais dans leur phrase
    codes = raw.filter(x => /^[A-Z]{1,2}$/.test(text(own(x, 'track'), 4).toUpperCase())).map(x => own(x, 'code')),
    times = raw.filter(x => own(x, 'code') === 'time').map(timeOf),
    // SOG-0391 (b bis) : les niveaux offerts par les routes écartées pour le NIVEAU (entiers de FL10 à FL660, uniques, triés, vingt au plus)
    // — de CES routes seulement (règle de l'ergonome, 17/11) : le passage de son entrée dans sa fenêtre, ou sans ces champs (vol sans
    // heure : la validité n'est pas vérifiée) ; une borne absente laisse la fenêtre ouverte de ce côté
    inWindow = t => !t.at || (!t.from || t.at >= t.from) && (!t.to || t.at <= t.to),
    offered = [...new Set(raw.filter(x => own(x, 'code') === 'level' && inWindow(timeOf(x))).flatMap(x => (Array.isArray(own(x, 'levels')) ?
      own(x, 'levels') : []).slice(0, 40)).filter(n => Number.isInteger(n) && n >= 10 && n <= 660))].sort((a, b) => a - b).slice(0, 20),
    win = times.find(x => x.from && x.to) || {},
    cause = {
      time: codes.filter(c => c === 'time').length,
      level: codes.filter(c => c === 'level').length,
      direction: codes.filter(c => c === 'direction').length,
      levels: offered,
      at: times.map(x => x.at).filter(Boolean).sort()[0] || '',
      from: win.from || '',
      to: win.to || ''
    };
  return out.length || rejected.length || noTime || entry ? {
    list: out,
    rejected,
    noTime,
    entry,
    cause,
    // SOG-0391 (b) : le sens du vol dit par le moteur (« east » | « west ») ; '' sinon (rien n'est deviné)
    direction: ['east', 'west'].includes(own(v, 'direction')) ? own(v, 'direction') : ''
  } : null;
}

function natOf(n) {
  if (!n || typeof n !== 'object') return null;
  const tracks = [...new Set((Array.isArray(n.tracks) ? n.tracks : []).map(t => String(t ?? '').toUpperCase()).filter(t =>
    /^[A-Z]{1,2}$/.test(t)))].slice(0, 6);
  return tracks.length ? {
    tracks,
    issued: /^\d{2}\/\d{2}$/.test(String(n.issued ?? '')) ? String(n.issued) : '',
    stale: n.stale === true
  } : null;
}
/** SOG-0372 (c, point 3) : les points d'un itinéraire tels que le moteur les a placés (`points`, view.points_of d'AeroDB, afac50be9) — une
 *  entrée non sûre : 600 au plus, propriétés propres seulement, identifiant par motif (nom de 2 à 12 signes, ou point NAT « 54/50 »),
 *  latitude ±90, longitude ±180, 5 décimales, un nom une fois ; un point illisible est écarté. */
const PT_ID = /^(?:[A-Z0-9]{2,12}|\d{2,4}\/\d{2,3})$/;

function pointsOf(list) {
  const out = [],
    seen = new Set();
  for (const p of (Array.isArray(list) ? list : []).slice(0, 600)) {
    if (!p || typeof p !== 'object') continue;
    const own = k => Object.hasOwn(p, k) ? p[k] : undefined,
      id = text(own('id'), 12).toUpperCase(),
      lat = num(own('lat'), -90, 90),
      lon = num(own('lon'), -180, 180);
    if (!PT_ID.test(id) || lat === null || lon === null || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      lat: Math.round(lat * 1e5) / 1e5,
      lon: Math.round(lon * 1e5) / 1e5
    });
  }
  return out;
}
/** Un itinéraire de la réponse, borné. */
function altOf(a, role, errors, reviews = []) {
  const segments = (Array.isArray(a?.segments) ? a.segments : []).slice(0, 800).map(segOf).filter(s => s.from && s.to),
    faults = Math.max(segments.filter(s => s.state === 'error').length, Math.round(num(a?.faults, 0, 999) || 0));
  return {
    role,
    name: text(a?.name, 60),
    route: routeWords(text(a?.route, 800)), // SOG-0390 : la voie composée (« N71B-N90B ») gardée
    distanceNm: num(a?.distanceNm, 0, 19999),
    fl: num(a?.fl, 0, 700) !== null ? Math.round(+a.fl) : null,
    incomplete: a?.incomplete === true,
    proposal: a?.proposal === true, // une proposition de repli d'un plan impossible : jamais validée, montrée à part
    accepted: !faults && !errors.length && a?.incomplete !== true && a?.proposal !==
      true, // un contrôle incomplet n'est jamais présenté comme contrôlé
    errors,
    reviews: a?.incomplete === true ? reviews : [],
    faults,
    sid: procOf(a?.sid, 'SID'),
    star: procOf(a?.star, 'STAR'),
    control: controlOf(a?.control),
    nat: natOf(a?.nat),
    points: pointsOf(a?.points), // SOG-0372 (c, point 3) : les positions du moteur, connues du champ Route quand l'itinéraire est pris
    segments
  };
}

/** La réponse du travail, nettoyée (voir l'en-tête). Les erreurs du moteur (issues de niveau error) vont à la route saisie en check ;
 *  en compute, sans itinéraire possible, la première dit pourquoi. */
/** SOG-0389 (b) : le niveau du calcul et d'où il vient, lu comme une entrée non sûre — `sections.fl` et `sections.fl_basis` du moteur
 *  ('request' | 'default') d'abord ; sinon `level` d'une réponse gardée sur l'appareil (route_alts.json) ; sinon la demande : sans `fl`,
 *  le moteur a pris son niveau par défaut. FL entier de 10 à 660 ou null ; null sans base connue. */
function levelOf(res, asked, plans) {
  const own = (o, k) => o && typeof o === 'object' && !Array.isArray(o) && Object.hasOwn(o, k) ? o[k] : undefined,
    fl = n => Number.isInteger(n) && n >= 10 && n <= 660 ? n : null,
    sec = own(res, 'sections'),
    kept = own(res, 'level'),
    basis = ['request', 'default'].includes(own(sec, 'fl_basis')) ? own(sec, 'fl_basis') : ['request', 'default'].includes(own(kept,
      'basis')) ? own(kept, 'basis') : asked && typeof asked === 'object' ? (fl(asked.fl) !== null ? 'request' : 'default') : '';
  return basis ? {
    fl: fl(own(sec, 'fl')) ?? fl(own(kept, 'fl')) ?? plans[0]?.fl ?? null,
    basis
  } : null;
}

/** SOG-0391 (b) : l'heure de départ du calcul — celle que le moteur dit avoir prise (`sections.depart.time`), sinon celle d'une réponse
 *  gardée sur l'appareil (`depart`), sinon celle de la demande (`date`) — et si elle était l'heure présente faute d'heure du vol
 *  (`now` : posé par la page sur la demande, gardé avec la réponse). { time: « AAAA-MM-JJTHH:MMZ », now } ; null sans heure lisible. */
function departOf(res, asked) {
  const own = (o, k) => o && typeof o === 'object' && !Array.isArray(o) && Object.hasOwn(o, k) ? o[k] : undefined,
    kept = own(res, 'depart');
  // le moteur dit n'avoir pris aucune heure (`depart.basis` = 'none') : aucune heure de départ n'est dite
  if (own(own(own(res, 'sections'), 'depart'), 'basis') === 'none') return null;
  const time = isoMinute(own(own(own(res, 'sections'), 'depart'), 'time')) || isoMinute(own(kept, 'time')) || isoMinute(own(asked, 'date'));
  return time ? {
    time,
    now: own(kept, 'now') === true || own(asked, 'now') === true
  } : null;
}
/** SOG-0391 (b) : ce que la page garde de `sections` avec la réponse (route_alts.json), pour que la preuve, la route libre et sa cause se
 *  relisent après un rechargement : les seules clés que proofOf et levelOf lisent, bornées comme ils les bornent ; relu par eux. */
export function sectionsKept(v) {
  const own = k => v && typeof v === 'object' && !Array.isArray(v) && Object.hasOwn(v, k) ? v[k] : undefined;
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  return {
    sections: Array.isArray(own('sections')) ? own('sections').slice(0, 6) : [],
    rejected: Array.isArray(own('rejected')) ? own('rejected').slice(0, 40) : [],
    depart: own('depart') ?? null,
    entry: own('entry') ?? null,
    direction: own('direction') ?? null,
    fl: own('fl') ?? null,
    fl_basis: own('fl_basis') ?? null
  };
}

export function normalize(res, action = 'compute', asked = null) {
  if (!res || res.ok !== true) return {
    ok: false,
    reason: ['invalid', 'no-rad', 'failed', 'busy', 'offline', 'stopped'].includes(res?.reason) ? res.reason : 'failed',
    message: text(res?.message, 300),
    errors: [],
    plans: [],
    limitation: '',
    gaps: [],
    cache: null
  };
  const check = action === 'check',
    errors = (Array.isArray(res.issues) ? res.issues : []).slice(0, 300).filter(x => x?.level === 'error').map(x => text(x?.text, 300))
    .filter(Boolean).slice(0, 5),
    reviews = (Array.isArray(res.issues) ? res.issues : []).slice(0, 300).filter(x => x?.level === 'review').map(x => text(x?.text, 300))
    .filter(Boolean).slice(0, 5),
    plans = (Array.isArray(res.alternatives) ? res.alternatives : []).slice(0, check ? 1 : 3)
    .map((a, i) => altOf(a, i ? 'alternative' : 'primary', check ? errors : [], check ? reviews : []))
    .filter(p => p.route);
  // SOG-0354 (L2b 3) : le découpage est celui de l'itinéraire calculé (le premier) ; jamais pour une proposition de repli
  const proof = check ? null : proofOf(res.sections);
  if (proof && plans[0] && plans[0].role === 'primary' && !plans[0].proposal) plans[0].proof = proof;
  return {
    ok: true,
    reason: '',
    message: !plans.length && errors[0] ? errors[0] : text(res.message, 300),
    errors,
    plans,
    level: check ? null : levelOf(res, asked, plans),
    depart: check ? null : departOf(res, asked),
    limitation: text(res.limitation, 400),
    // SOG-0161 (AeroDB 329847a19) : ce que la réponse est — une route calculée, des propositions de repli, rien ; déduit des itinéraires
    // pour une réponse plus ancienne
    status: ['computed', 'proposal', 'none'].includes(res.status) ? res.status : !plans.length ? 'none' : plans[0].proposal ? 'proposal' :
      'computed',
    cache: cacheOf(res.cache),
    gaps: (Array.isArray(res.gaps) ? res.gaps : []).slice(0, 8).map(g => ({
      name: text(g?.name, 80),
      reason: text(g?.reason, 300)
    })).filter(g => g.name)
  };
}
