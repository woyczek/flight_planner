// V3 fuel — SOG-0398 lot 1 : la vérification du terrain de dégagement, en calcul pur (ni page, ni stockage, ni réseau). Trois critères,
// chacun dans l'un de quatre états — ok (vert), warn (orange : utilisable, avec une réserve), err (rouge : ne convient pas), grey (non
// vérifié : la donnée manque, et laquelle) ; jamais une coche verte sur ce qui n'a pas pu être vérifié.
//
// API :
//   runwayOf(ad, minFt, type) → critère PISTE : la longueur de piste mini de la fiche de l'aéronef (ft) contre la plus longue piste du bon
//     revêtement de l'enregistrement du terrain (aerodb : hardLen, runways[] { lengthM, surface }) ; type : le revêtement de la fiche
//     (« HARD » par défaut, « SOFT » : toute piste hors plan d'eau ; un autre : non vérifié).
//   aidsOf(cov) → critère MOYENS : la couverture des procédures du terrain (aerodb.coverage) ; tenues et complètes sans approche aux
//     instruments : « à vue seulement » (orange) ; non tenues, ou lues en partie sans approche : non vérifié.
//   weatherOf(taf, t, o) → critère MÉTÉO : la pire catégorie de vol (FAA : VFR, MVFR, IFR, LIFR) des groupes du TAF entre une heure avant
//     et une heure après l'arrivée au dégagement (t, secondes), groupes TEMPO et PROB compris : un INDICATEUR ; VFR ou MVFR vert, IFR
//     orange, LIFR rouge (Q-0075). o : { read (la météo a été lue), noTaf (TAF indisponible sur cet appareil) }.
//   distOf(nm) → SOG-0528 : critère DISTANCE du dégagement choisi, la règle de la proposition (candidates) — au-delà de CAND_MAX_NM de
//     l'arrivée : ne convient pas (rouge) ; en deçà de CAND_MIN_NM : réserve (orange, même météo probable) ; entre les deux, ou distance
//     inconnue : null (rien à dire, aucun critère de plus).
//   judge(criteria) → { state, ok, grey } : le pire état — err, puis warn, puis grey (un critère non vérifié ne laisse jamais le vert),
//     sinon ok ; ok et grey : les nombres de critères bons et non vérifiés.
//   SOG-0398 lot 2, « Proposer un dégagement » :
//   candidates(ads, { from, minFt, type, exclude, dist, max }) → [{ ad, icao, nm, rwy }] : les terrains de `ads` (enregistrements complets
//     d'aerodb) à CAND_MIN_NM au moins et CAND_MAX_NM au plus de `from` (dist(from, ad) en NM : le trait droit), d'un code OACI de
//     quatre lettres, ouverts au public, ni hélistation ni plan d'eau, hors `exclude` (l'arrivée, le départ), dont la PISTE n'est pas
//     écartée (runwayOf : ok, ou non vérifiée — SOG-0494 : une donnée absente n'écarte pas) ; triés par distance, `max` au plus. Sans
//     longueur mini dans la fiche : [] (rien ne peut être retenu sur la piste).
//   aidsKept(aids) : les MOYENS retiennent le terrain — une approche (ok), « à vue seulement » (warn), ou non vérifiés (grey : la base ne
//     tient pas ses procédures ; SOG-0494, l'utilisateur : aucun dégagement autour de LQSA, faute de procédures dans la base).
//   unverified(rwy, aids) → le nombre de critères non vérifiés parmi la piste et les moyens (0, 1 ou 2) : les terrains vérifiés d'abord.
//   CAND_SCAN : les candidats examinés au plus (une couverture demandée à aerodb pour chacun), les plus proches.
//   proposalOf(crits) → { sign, state, why } : sign, l'état des trois critères (judge) pour la liste de Carburant ; state, celui du
//     document de la Carte ('ok' | 'warn', null pour un terrain à écarter : météo LIFR) ; why, ses codes en liste fermée ('rwy-unread',
//     'aids-unread', 'aids-visual', 'wx-ifr', 'wx-unread').
// Chaque critère : { k: 'rwy' | 'aids' | 'wx', state, code, v } — code : la phrase à dire (textes du module), v : ses valeurs (nombres,
// catégories et heures seulement : aucun texte tiers).

import {
  isIcaoAlpha
} from '../../frame/lib/ad_field.js'; // SOG-0468 (2) : les règles nommées du code de terrain
import {
  ceiling,
  category,
  visibility
} from './weather.js';

const FT_PER_M = 3.28084;
/** L'ordre des états pour le signe de la ligne : le pire l'emporte. */
const RANK = {
  ok: 0,
  grey: 1,
  warn: 2,
  err: 3
};
/** Un nombre lu, ou faux : null, absent ou vide ne sont pas 0. */
const num = v => v !== null && v !== undefined && v !== '' && Number.isFinite(+v);
const crit = (k, state, code, v = {}) => ({
  k,
  state,
  code,
  v
});

/** Critère PISTE (voir l'en-tête). */
export function runwayOf(ad, minFt, type) {
  if (!(num(minFt) && +minFt > 0)) return crit('rwy', 'grey', 'rwyNoSheet');
  if (!ad) return crit('rwy', 'grey', 'rwyNoAd');
  const t = String(type || 'HARD').toUpperCase(),
    rws = Array.isArray(ad.runways) ? ad.runways.slice(0, 60) : [],
    m = Math.round(+minFt);
  let lenM = null;
  if (t === 'HARD') {
    if (num(ad.hardLen)) lenM = +ad.hardLen;
    else {
      const hard = rws.filter(r => r?.surface === 'hard' && num(r.lengthM)).map(r => +r.lengthM);
      if (hard.length) lenM = Math.max(...hard);
    }
    if (lenM === 0) return crit('rwy', 'err', 'rwyNoHard', {
      m
    });
  } else if (t === 'SOFT') {
    const all = [...(num(ad.hardLen) ? [+ad.hardLen] : []), ...rws.filter(r => r?.surface !== 'water' && num(r.lengthM)).map(r => +r
      .lengthM)];
    if (all.length) lenM = Math.max(...all);
  } else return crit('rwy', 'grey', 'rwyType');
  if (lenM === null) return crit('rwy', 'grey', 'rwyNoData');
  const l = Math.round(lenM * FT_PER_M),
    v = {
      l,
      m,
      hard: t === 'HARD'
    };
  return l >= m ? crit('rwy', 'ok', 'rwyOk', v) : crit('rwy', 'err', 'rwyShort', v);
}

/** Critère MOYENS (voir l'en-tête). cov : la sortie d'aerodb.coverage(icao). */
export function aidsOf(cov) {
  const held = cov && (cov.level === 'green' || (cov.level === 'orange' && cov.partial)) && cov.counts,
    n = held && num(cov.counts.APP) ? Math.max(0, Math.round(+cov.counts.APP)) : null;
  if (n === null) return crit('aids', 'grey', 'aidsNoBase');
  if (n > 0) return crit('aids', 'ok', 'aidsApp', {
    n
  });
  // lues en partie : une approche peut être dans les pages non lues — rien n'est affirmé
  return cov.partial ? crit('aids', 'grey', 'aidsPartial') : crit('aids', 'warn', 'aidsVisual');
}

const hhmm = s => new Date(s * 1000).toISOString().slice(11, 16) + 'Z';
const WORST = ['VFR', 'MVFR', 'IFR', 'LIFR'];

/** Critère MÉTÉO (voir l'en-tête). taf : le TAF du terrain au format d'aviationweather.gov (validTimeFrom / To, fcsts[]). */
export function weatherOf(taf, t, {
  read = true,
  noTaf = false
} = {}) {
  if (!num(t)) return crit('wx', 'grey', 'wxNoTime');
  if (!read) return crit('wx', 'grey', 'wxNotRead');
  if (!taf || typeof taf !== 'object') return crit('wx', 'grey', noTaf ? 'wxNoKey' : 'wxNoTaf');
  const lo = +t - 3600,
    hi = +t + 3600,
    a = hhmm(lo),
    b = hhmm(hi);
  if (!(num(taf.validTimeFrom) && num(taf.validTimeTo)) || +t < +taf.validTimeFrom || +t >= +taf.validTimeTo) return crit('wx', 'grey',
    'wxOutside', {
      at: hhmm(+t)
    });
  const cats = (Array.isArray(taf.fcsts) ? taf.fcsts.slice(0, 80) : []).filter(f => f && +f.timeFrom < hi && +f.timeTo > lo)
    .map(f => category(ceiling(f.clouds, f.vertVis), visibility(f.visib))).filter(c => WORST.includes(c));
  if (!cats.length) return crit('wx', 'grey', 'wxNoCat', {
    a,
    b
  });
  const c = cats.reduce((w, x) => WORST.indexOf(x) > WORST.indexOf(w) ? x : w, 'VFR');
  return crit('wx', c === 'LIFR' ? 'err' : c === 'IFR' ? 'warn' : 'ok', 'wxCat', {
    c,
    a,
    b
  });
}

/** SOG-0528 : le critère DISTANCE (voir l'en-tête) ; nm : la distance de l'arrivée au dégagement (le trait droit, comme candidates). */
export function distOf(nm) {
  if (!num(nm) || +nm < 0) return null;
  const d = Math.round(+nm);
  return +nm > CAND_MAX_NM ? {
    k: 'dist',
    state: 'err',
    code: 'distFar',
    v: {
      d,
      max: CAND_MAX_NM
    }
  } : +nm < CAND_MIN_NM ? {
    k: 'dist',
    state: 'warn',
    code: 'distNear',
    v: {
      d,
      min: CAND_MIN_NM
    }
  } : null;
}

/** SOG-0398 lot 2 : les bornes de la proposition — distance à l'arrivée (NM), terrains de la liste de Carburant, terrains du document de la
 *  Carte. */
export const CAND_MIN_NM = 30,
  CAND_MAX_NM = 300,
  CAND_LIST = 3,
  CAND_DOC = 7,
  CAND_SCAN = 20;

/** Les terrains candidats (voir l'en-tête). */
export function candidates(ads, {
  from,
  minFt,
  type,
  exclude = [],
  dist,
  max = 60
} = {}) {
  if (!(num(minFt) && +minFt > 0) || !from || typeof dist !== 'function') return [];
  const out = [],
    skip = new Set(exclude.map(x => String(x || '').toUpperCase()));
  for (const ad of (Array.isArray(ads) ? ads : []).slice(0, 5000)) {
    const icao = String(ad?.icao || '').toUpperCase();
    if (!isIcaoAlpha(icao) || skip.has(icao) || ad.type === 'HP' || ad.water === true || ad.public === false || !num(ad.lat) ||
      !num(ad.lon)) continue;
    const nm = dist(from, {
      lat: +ad.lat,
      lon: +ad.lon
    });
    if (!(nm >= CAND_MIN_NM && nm <= CAND_MAX_NM)) continue;
    const rwy = runwayOf(ad, minFt, type);
    if (rwy.state === 'err') continue; // trop courte, ou sans piste du bon revêtement ; non vérifiée : gardée (SOG-0494)
    skip.add(icao);
    out.push({
      ad,
      icao,
      nm,
      rwy
    });
  }
  return out.sort((a, b) => a.nm - b.nm).slice(0, max);
}

/** Les MOYENS retiennent-ils le terrain (voir l'en-tête) ? */
export const aidsKept = aids => ['ok', 'warn', 'grey'].includes(aids?.state);

/** Le nombre de critères non vérifiés parmi la piste et les moyens (voir l'en-tête). */
export const unverified = (rwy, aids) => (rwy?.state === 'grey' ? 1 : 0) + (aids?.state === 'grey' ? 1 : 0);

/** L'état d'un terrain proposé, pour la liste et pour la Carte (voir l'en-tête). crits : [rwy, aids, wx]. */
export function proposalOf(crits) {
  const [rwy, aids, wx] = crits || [],
    why = [];
  if (rwy?.state === 'grey') why.push('rwy-unread'); // SOG-0494 : proposé quand même, la réserve dite
  if (aids?.state === 'grey') why.push('aids-unread');
  if (aids?.state === 'warn') why.push('aids-visual');
  if (wx?.state === 'warn') why.push('wx-ifr');
  if (!wx || wx.state === 'grey') why.push('wx-unread');
  return {
    sign: judge(crits).state,
    state: wx?.state === 'err' ? null : why.some(w => w !== 'wx-unread') ? 'warn' : 'ok',
    why
  };
}

/** Le signe de la ligne et les comptes (voir l'en-tête). */
export function judge(criteria) {
  const list = criteria || [];
  return {
    state: list.reduce((w, c) => RANK[c.state] > RANK[w] ? c.state : w, 'ok'),
    ok: list.filter(c => c.state === 'ok').length,
    grey: list.filter(c => c.state === 'grey').length
  };
}
