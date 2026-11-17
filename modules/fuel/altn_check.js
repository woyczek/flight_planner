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
//   judge(criteria) → { state, ok, grey } : le pire état — err, puis warn, puis grey (un critère non vérifié ne laisse jamais le vert),
//     sinon ok ; ok et grey : les nombres de critères bons et non vérifiés.
// Chaque critère : { k: 'rwy' | 'aids' | 'wx', state, code, v } — code : la phrase à dire (textes du module), v : ses valeurs (nombres,
// catégories et heures seulement : aucun texte tiers).

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

/** Le signe de la ligne et les comptes (voir l'en-tête). */
export function judge(criteria) {
  const list = criteria || [];
  return {
    state: list.reduce((w, c) => RANK[c.state] > RANK[w] ? c.state : w, 'ok'),
    ok: list.filter(c => c.state === 'ok').length,
    grey: list.filter(c => c.state === 'grey').length
  };
}
