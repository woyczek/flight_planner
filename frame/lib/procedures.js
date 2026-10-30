// Règles des procédures (SID, STAR, approches) partagées par Carburant et le mode choix de la Carte (V3_SPECIFICATION § 10.23, 10.26,
// 10.29 c). Module ES pur : ni état du module, ni texte, ni DOM. Les fiches sont celles d'aerodb (schéma commun : id, kind, name,
// runways, transition, points, status…) ; les pistes sont celles de route.procedures v2 (« 23 », « 05R »).
//
//   rwNum(x), sameRwy(a, b), servesAll(rec), servesRwy(rec, rwy) : la piste et les fiches qui la desservent.
//   nameOf(rec, id) : le nom d'une procédure (null sans nom ou « NONAME » : le texte « sans nom » est celui de l'appelant).
//   conflictsOf(key, rec, choice, byId), orderProcedures(list, key, choice, byId) : les ⚠ et l'ordre des listes, en données.
//   transitionsOf(recs, id) : les transitions d'une SID ou d'une STAR ; appChoices(apps) : les approches listées une fois, avec leurs
//     transitions ; runwayChoices(known, all, ad) : les pistes à proposer pour un terrain.
//   runwayOf(proc), firstServing(list, rwy) : la piste unique d'une procédure, la première qui dessert une piste (§ 10.30).
//   familyOf(name), siblingsOf(list, proc), familiesOf(list) : les familles de SID / STAR (ABLI4L, ABLI4R → une ligne « ABLI4 »).
//   compatible(list, { rwy, sid, star, app }, byId) : ce qui va avec le choix, les trois familles dans n'importe quel ordre.
//   isAppTransition(rec), labelOf(app, list), transitionLabelOf(rec) : les segments d'approche initiale (« INA RNAV RWY 06 ») en
//     transitions communes aux finales de la piste, le libellé court d'une finale (« ILS 06 »), celui d'une transition
//     (« via ODILO · ODILO 1A ») (§ 10.30, quatrième lecture).
//   summaryOf(side, { byId, wind, via }) : les trois lignes du choix (« 28L · ↓ 12 kt · ← 6 kt », « ABLI4L via ABLIN »,
//     « ILS 28L via PIZSA »), le même texte dans le volet de la Carte et le titre d'un côté de Carburant (§ 10.30, seconde lecture).
//
// Transition : conflictsOf et orderProcedures ont d'abord vécu dans frame/lib/current_flight.js (29/10/2026), puis flight_path.js,
// qui les ré-exporte encore (current_flight.js ré-exporte flight_path.js), pour que les imports de la Carte continuent de marcher ;
// les appelants importent d'ici, et la ré-exportation partira quand la Carte aura changé ses imports.

import {
  label as windLabel
} from './wind.js';

/** Piste sans « RW » ni espaces, en majuscules (« RW23 » → « 23 »). */
export const rwNum = x => String(x ?? '').trim().toUpperCase().replace(/^RW/, '');
/** Même piste : « 24 » et « RW24 » se valent ; un numéro sans côté (« 14 ») vaut ses pistes parallèles (« 14L », « 14R »). */
export const sameRwy = (a, b) => {
  const x = rwNum(a),
    y = rwNum(b);
  return !!x && !!y && (x === y || /^\d\d$/.test(x) && y.startsWith(x) || /^\d\d$/.test(y) && x.startsWith(y));
};
/** Une fiche qui dessert toutes les pistes : aucune piste nommée, ou « ALL » / « RWALL ». */
export const servesAll = rec => !(rec?.runways || []).length || rec.runways.some(x => rwNum(x) === 'ALL');
/** La fiche dessert-elle la piste ? Vrai sans piste donnée ou quand la fiche les dessert toutes. */
export const servesRwy = (rec, rwy) => !rwNum(rwy) || servesAll(rec) || rec.runways.some(x => sameRwy(x, rwy));
/** Ordre naturel des pistes : par numéro, puis par côté (« 02 », « 06 », « 14L », « 14R »). */
export const rwOrder = (a, b) => String(a).localeCompare(String(b), undefined, {
  numeric: true
});

/** Fiche douteuse (§ 10.26), jamais listée ni montrée comme une bonne procédure : statut « doubt » (aerodb), ou une fiche sans nom
 *  (name vide, identifiant « ….NONAME.… »), ceinture tant qu'aerodb ne marque pas lui-même. Une règle pour Carburant et la Carte. */
export const isDoubt = rec => rec?.status === 'doubt' || !String(rec?.name ?? '').trim() || /\.NONAME\./i.test(String(rec?.id ?? ''));

/** Nom d'une procédure : celui de la fiche, sinon le troisième champ de l'identifiant (« LFBD.SID.ROYAN6P.RW23.NONE » → « ROYAN6P ») ;
 *  null sans nom ou pour « NONAME » (le texte « STAR sans nom » est celui de l'appelant). */
export function nameOf(rec, id) {
  const n = String(rec?.name ?? '').trim() || String(id ?? rec?.id ?? '').split('.')[2] || '';
  return !n || n.toUpperCase() === 'NONAME' ? null : n;
}

/** Fiche d'un identifiant, que byId soit une Map, un objet { id: fiche } ou une fonction ; null sinon. */
const recById = (byId, id) => typeof id !== 'string' || !id ? null : (typeof byId === 'function' ? byId(id) : byId instanceof Map ? byId
  .get(id) :
  byId?.[id]) || null;

/** Conflits d'une fiche avec le choix courant de son côté, en données : [] sans conflit, sinon
 *  [{ kind: 'rwy', rwy }] (une SID, une STAR ou une approche qui ne dessert pas la piste choisie) et/ou
 *  [{ kind: 'starApp', app, appId }] (sans piste choisie, une STAR qui ne dessert aucune piste de l'approche choisie ; app : son nom).
 *  key : 'sid' | 'star' | 'app' | 'trans' | 'appTrans' (les transitions n'ont pas de conflit) ; rec : la fiche d'aerodb ; choice : le
 *  côté de route.procedures v2 ({ rwy, sid, star, app… }) ; byId : les fiches par identifiant (Map, objet ou fonction), pour
 *  choice.app. La continuité des points entre STAR et approche n'est jamais un conflit (§ 10.23) : les STAR finissent en attente ou en
 *  guidage radar, la Carte raccorde en tireté. Le texte est celui de l'appelant. */
export function conflictsOf(key, rec, choice, byId) {
  const out = [],
    o = choice || {};
  if (!rec) return out;
  if (['sid', 'star', 'app'].includes(key) && !servesRwy(rec, o.rwy)) out.push({
    kind: 'rwy',
    rwy: o.rwy
  });
  const app = recById(byId, o.app);
  if (key === 'star' && !rwNum(o.rwy) && app && !servesAll(app) && !servesAll(rec) && !app.runways.some(x => servesRwy(rec, x))) out.push({
    kind: 'starApp',
    app: nameOf(app, app.id),
    appId: app.id
  });
  return out;
}

/** Liste de procédures (ou de pistes) dans l'ordre où le pilote les cherche, nouveau tableau : d'abord ce qui est compatible avec le
 *  choix courant, puis ce qui est en conflit (⚠, toujours choisissable) ; dans chaque groupe, le repli X-Plane local en dernier, puis
 *  par piste (celles qui les desservent toutes d'abord), par nom, par transition. Toujours plate. key : 'rwy' pour une liste de pistes
 *  (chaînes ou { id }) : celles que dessert la SID (côté Départ) ou l'approche (côté Arrivée) déjà choisie viennent en tête, puis les
 *  autres par ordre naturel ; sinon 'sid' | 'star' | 'app' | 'trans' | 'appTrans' (conflictsOf). choice et byId comme conflictsOf. */
export function orderProcedures(list, key, choice, byId) {
  const arr = [...(list || [])];
  if (key === 'rwy') {
    const rec = recById(byId, choice?.sid) || recById(byId, choice?.app),
      id = r => typeof r === 'string' ? r : r?.id,
      first = r => rec && !servesAll(rec) && servesRwy(rec, id(r)) ? 0 : 1;
    return arr.sort((a, b) => first(a) - first(b) || rwOrder(rwNum(id(a)), rwNum(id(b))));
  }
  const bad = r => conflictsOf(key, r, choice, byId).length ? 1 : 0,
    xp = r => r?.status === 'xplane' || r?.local ? 1 : 0,
    rw = r => servesAll(r) ? '' : r.runways.map(rwNum).sort(rwOrder).join('/');
  return arr.sort((a, b) => bad(a) - bad(b) || xp(a) - xp(b) || rwOrder(rw(a), rw(b)) || String(a?.name ?? '').localeCompare(String(b
      ?.name ?? '')) ||
    String(a?.transition ?? '').localeCompare(String(b?.transition ?? '')));
}

/** Transitions d'une SID ou d'une STAR choisie (id) parmi les fiches recs : mêmes sorte et nom, avec une transition ; [] sans choix ou
 *  sans nom. Le nom est celui de la fiche d'identifiant id, sinon celui que porte l'identifiant. */
export function transitionsOf(recs, id) {
  const list = recs || [],
    own = id ? list.find(r => r.id === id) : null,
    name = id ? nameOf(own, id) : null,
    kind = own?.kind || String(id ?? '').split('.')[1] || null;
  return name ? list.filter(r => r.transition && nameOf(r) === name && (!kind || !r.kind || r.kind === kind)) : [];
}

/** La fiche atteint-elle la piste : un de ses points (hors approche interrompue) est un seuil « RWnn ». */
const reachesRunway = rec => (rec?.points || []).some(p => p?.phase !== 'missed' && /^RW\d/i.test(String(p?.id ?? '')));

/** Segment d'approche initiale, jamais une ligne d'approche (§ 10.30, quatrième lecture) : une fiche APP nommée « INA … » (le SIA publie
 *  ainsi les segments de l'IAF à l'IF, « INA RNAV RWY 06 » avec transition « ODILO 1A »), ou portant une transition et des points
 *  sans atteindre la piste (elle finit avant l'IF). */
export const isAppTransition = rec => rec?.kind === 'APP' && (/^INA\b/i.test(String(rec?.name ?? '').trim()) || !!rec?.transition && !!rec
  .points?.length && !reachesRunway(rec));

/** Les approches d'un terrain, listées une fois : { list, transitionsOf(id) }. Les segments d'approche initiale (isAppTransition) ne
 *  sont jamais des lignes. list : parmi les autres fiches, les approches sans transition et, pour une approche que l'eAIP ne donne que
 *  par point d'entrée (une fiche par entrée jusqu'à la piste, toutes avec une transition), sa fiche finale seule : celle qu'aucune
 *  autre fiche de même nom ne suit (une fiche alimente une autre quand son dernier repère est le premier de l'autre) ; sans fiche finale
 *  reconnue, toutes les fiches d'entrée. transitionsOf(id) : pour une approche donnée par ses entrées, les fiches qui mènent à sa fiche
 *  finale ; sinon ses transitions de même nom ; plus les segments d'approche initiale : ceux de son nom, et ceux qu'aucune finale ne
 *  nomme et qui desservent sa piste (le SIA les publie une fois pour toutes les finales de la piste : ILS, RNP, LOC…) ; jamais elle-même,
 *  triées par IAF (premier point) puis par transition. */
export function appChoices(apps) {
  const every = apps || [],
    init = every.filter(isAppTransition),
    all = every.filter(r => !isAppTransition(r)),
    main = all.filter(r => !r.transition),
    named = new Set(main.map(r => nameOf(r))),
    entry = all.filter(r => r.transition && !named.has(nameOf(r))),
    feeds = (a, b) => a !== b && nameOf(a) === nameOf(b) && !!a.points?.at(-1)?.id && a.points.at(-1).id === b.points?.[0]?.id,
    finals = entry.filter(r => !entry.some(x => feeds(r, x))),
    list = [...main, ...(finals.length ? finals : entry)],
    listed = new Set(list.map(r => nameOf(r))),
    iaf = r => String(r?.points?.[0]?.id ?? ''),
    shares = (r, app) => servesAll(r) || servesAll(app) || r.runways.some(x => servesRwy(app, x));
  return {
    list,
    transitionsOf: id => {
      const chosen = entry.find(r => r.id === id),
        app = list.find(r => r.id === id) || every.find(r => r.id === id) || null,
        own = chosen ? entry.filter(r => feeds(r, chosen)) : transitionsOf(all, id).filter(r => r.id !== id),
        segs = app ? init.filter(r => nameOf(r) === nameOf(app) || !listed.has(nameOf(r)) && shares(r, app)) : [];
      return [...new Map([...own, ...segs].filter(r => r.id !== id).map(r => [r.id, r])).values()].sort((a, b) => iaf(a).localeCompare(
        iaf(b)) || String(a.transition ?? '').localeCompare(String(b.transition ?? '')));
    }
  };
}

/** Les parties d'un nom d'approche publié « TYPE [lettre] … RWY nn » : { type, letter, rwy } ; null pour un autre nom (« I13R »,
 *  « ILS09 » : gardés tels quels). « ILS CAT I or CAT II or CAT III RWY 06 » → ILS, '', 06 ; « RNP Y RWY 06 » → RNP, Y, 06. */
function appParts(rec) {
  const m = /^(.+?)\s+RWY\s*(\d{2}[LRC]?)$/.exec(String(nameOf(rec) ?? '').trim().toUpperCase().replace(/\s+/g, ' '));
  if (!m) return null;
  const t = m[1].split(' ');
  return {
    type: t[0],
    letter: /^[A-Z]$/.test(t[1] || '') ? t[1] : '',
    rwy: m[2]
  };
}

/** Libellé court d'une finale (§ 10.30, quatrième lecture) : le type et la piste, sans les catégories (« CAT I or CAT II… »,
 *  « or LOC ») ni « RWY » : « ILS 06 », « RNP 06 », « LOC 07 » ; le nom publié reste celui de la fiche (title). Jamais deux libellés
 *  identiques dans list (les lignes d'approche, appChoices().list) : deux finales de même type et piste gardent la lettre du SIA
 *  (« RNP Y 06 ») ; si cela ne suffit pas, le premier point rejoint le libellé (« RNP 06 · IPO06 »). Un nom d'une autre forme est
 *  gardé tel quel. */
export function labelOf(app, list) {
  if (!app) return '';
  const others = [...new Map([app, ...(list || [])].filter(Boolean).map(r => [r.id, r])).values()].filter(r => r.id !== app.id),
    levels = r => {
      const p = appParts(r),
        n = nameOf(r, r?.id) || '';
      if (!p) return [n, n, n];
      const two = [p.type, p.letter, p.rwy].filter(Boolean).join(' ');
      return [`${p.type} ${p.rwy}`, two, r.points?.[0]?.id ? `${two} · ${r.points[0].id}` : two];
    },
    mine = levels(app);
  for (let i = 0; i < 2; i++)
    if (!others.some(r => levels(r)[i] === mine[i])) return mine[i];
  return mine[2];
}

/** Libellé d'une transition d'approche : « via ODILO · ODILO 1A » (l'IAF, son premier point, puis le nom publié avec sa lettre) ;
 *  « via VA201 » quand le nom est l'IAF. via : le mot de liaison (« via », le même dans les quatre langues). */
export function transitionLabelOf(rec, {
  via = 'via'
} = {}) {
  const iaf = String(rec?.points?.[0]?.id ?? '').trim(),
    t = String(rec?.transition ?? '').trim();
  return [iaf ? `${via} ${iaf}` : '', t && t !== iaf ? t : ''].filter(Boolean).join(' · ') || nameOf(rec, rec?.id) || '';
}

/** Pistes à proposer pour un terrain, [{ id }] : celles d'aerodb (known : fiches de pistes, ou déduites des fiches) ; sinon celles que
 *  nomment ses procédures (all : l'union de leurs pistes, « 20 », « 14L » ; une fiche qui les dessert toutes n'en nomme pas) ; sinon les
 *  deux sens de l'axe de la piste principale (ad : l'enregistrement du terrain dans la base, bearing, route vraie, et magVar, Est
 *  positive ; numéros magnétiques sans côté, « 24 » et « 06 »). Une piste d'aerodb sans position que seules des fiches absentes de
 *  `all` (non lues : sans nom, douteuses) nomment n'est pas proposée. [] sans rien. */
export function runwayChoices(known, all, ad) {
  const named = [...new Set((all || []).flatMap(r => servesAll(r) ? [] : r.runways.map(rwNum)))].sort(rwOrder),
    ok = (known || []).filter(r => r.lat != null && Number.isFinite(+r.lat) || named.some(n => sameRwy(n, r.id)));
  if (ok.length) return ok;
  if (named.length) return named.map(id => ({
    id
  }));
  if (!Number.isFinite(+ad?.bearing)) return [];
  return [0, 180].map(a => ({
    id: String(Math.round(((+ad.bearing + a - (+ad.magVar || 0)) % 360 + 360) % 360 / 10) % 36 || 36).padStart(2, '0')
  })).sort((a, b) => rwOrder(a.id, b.id));
}

/** La piste unique que dessert une procédure (« 07 », « 14L », sans « RW ») ; null quand elle en dessert plusieurs, toutes, ou aucune
 *  nommée (V3 § 10.30 : une procédure choisie qui ne dessert qu'une piste la propose). */
export function runwayOf(proc) {
  if (!proc || servesAll(proc)) return null;
  const r = [...new Set(proc.runways.map(rwNum))];
  return r.length === 1 ? r[0] : null;
}

/** La première procédure de la liste, dans l'ordre du groupe, qui dessert la piste (« Choisir OKRIX5B ») ; null s'il n'y en a pas.
 *  Sans piste, la première de la liste. */
export function firstServing(list, rwy) {
  return (list || []).find(p => p && servesRwy(p, rwy)) || null;
}

// ------------------------------------------------------------ seconde lecture du § 10.30 : familles, compatibilité, résumé
/** Le découpage d'un nom de SID ou de STAR en famille et suffixe : « ABLI4L » → { family: 'ABLI4', suffix: 'L' } (lettres, un chiffre,
 *  une lettre) ; null pour un autre nom. Ce n'est qu'une forme : un nom seul ne fait pas une famille (siblingsOf décide, d'après les
 *  autres fiches du terrain). */
export function familyOf(name) {
  const m = /^([A-Z]{2,6})(\d)([A-Z])$/.exec(String(name ?? '').trim().toUpperCase());
  return m ? {
    family: m[1] + m[2],
    suffix: m[3]
  } : null;
}

/** Les fiches de la famille de proc parmi list : même sorte, même radical et même chiffre, sans transition, dès que le dernier
 *  caractère diffère entre elles (au moins deux suffixes) ; [] sinon (une procédure seule de sa forme est une ligne ordinaire : jamais
 *  de devinette sur un nom seul). Dans l'ordre de list. */
export function siblingsOf(list, proc) {
  const f = familyOf(nameOf(proc));
  if (!f) return [];
  const same = (list || []).filter(r => r && !r.transition && (!proc.kind || r.kind === proc.kind) && familyOf(nameOf(r))?.family === f
    .family);
  return new Set(same.map(r => familyOf(nameOf(r)).suffix)).size > 1 ? same : [];
}

/** Les lignes d'une liste de SID ou de STAR, familles regroupées, dans l'ordre de leur première fiche : [{ name, recs, runways }].
 *  name : la famille (« ABLI4 ») ou le nom de la procédure seule ; recs : ses fiches (sans transition) ; runways : les pistes qu'elles
 *  nomment, triées (les petites étiquettes de la ligne ; [] pour une fiche qui les dessert toutes). */
export function familiesOf(list) {
  const rows = [],
    byKey = new Map();
  for (const r of list || []) {
    if (!r || r.transition) continue;
    const f = siblingsOf(list, r).length ? familyOf(nameOf(r)).family : null,
      key = f ? `${r.kind}:${f}` : null;
    if (key && byKey.has(key)) {
      byKey.get(key).recs.push(r);
      continue;
    }
    const row = {
      name: f || nameOf(r),
      recs: [r]
    };
    rows.push(row);
    if (key) byKey.set(key, row);
  }
  for (const row of rows) row.runways = [...new Set(row.recs.flatMap(x => servesAll(x) ? [] : x.runways.map(rwNum)))].sort(rwOrder);
  return rows;
}

/** Une STAR rejoint une approche quand elle dessert une piste de l'approche (l'une ou l'autre les desservant toutes : oui) ; la
 *  continuité des points n'est jamais exigée (§ 10.23). */
const joins = (star, app) => servesAll(app) || servesAll(star) || app.runways.some(x => servesRwy(star, x));

/** Ce qui, dans list, va avec le choix : une liste de pistes (chaînes ou { id }), de SID, de STAR ou d'approches, filtrée par les AUTRES
 *  familles du choix, dans n'importe quel ordre (§ 10.30, seconde lecture) :
 *    piste choisie → les SID et STAR qui la desservent, les approches vers elle ;
 *    STAR choisie → les pistes qu'elle dessert, les approches qu'elle rejoint ; SID choisie → les pistes qu'elle dessert ;
 *    approche choisie → sa piste (ses pistes), les STAR qui la rejoignent.
 *  choice : { rwy, sid, star, app }, chaque valeur une fiche, un identifiant (byId : Map, objet ou fonction, comme conflictsOf) ou un
 *  tableau (une famille choisie avant sa piste : ce qui va avec l'une de ses fiches) ; un champ absent, null (« Aucune ») ou introuvable
 *  ne filtre pas. Nouveau tableau, dans l'ordre de list. */
export function compatible(list, choice, byId) {
  const o = choice || {},
    recs = v => [].concat(v ?? []).map(x => typeof x === 'string' ? recById(byId, x) : x).filter(x => x && typeof x === 'object'),
    sid = recs(o.sid),
    star = recs(o.star),
    app = recs(o.app),
    rwy = rwNum(o.rwy),
    any = (arr, f) => !arr.length || arr.some(f),
    onRwy = r => !rwy || servesRwy(r, rwy);
  return [...(list || [])].filter(r => {
    if (typeof r === 'string' || !r?.kind) {
      const id = typeof r === 'string' ? r : r?.id;
      return any(sid, s => servesRwy(s, id)) && any(star, s => servesRwy(s, id)) && any(app, a => servesRwy(a, id));
    }
    if (r.kind === 'SID') return onRwy(r);
    if (r.kind === 'STAR') return onRwy(r) && any(app, a => joins(r, a));
    if (r.kind === 'APP') return onRwy(r) && any(star, s => joins(s, r));
    return true;
  });
}

/** Les trois lignes du choix d'un côté (route.procedures v2 : { rwy, sid | star, trans, app, appTrans }) : { rwy, proc, app }, chacune
 *  undefined (pas choisi), null (« Aucune » : le mot est celui de l'appelant) ou un texte : « 28L · ↓ 12 kt · ← 6 kt » (wind : les
 *  composantes de frame/lib/wind.js pour cette piste, ou rien), « ABLI4L via ABLIN » (la transition choisie), « ILS 28L via PIZSA ».
 *  Les noms viennent des fiches (byId), sinon de l'identifiant ; une transition se dit par son point d'entrée. via : le mot de liaison
 *  (« via » par défaut, le même dans les quatre langues de la suite). */
export function summaryOf(side, {
  byId,
  wind,
  via = 'via'
} = {}) {
  const o = side || {},
    values = byId instanceof Map ? [...byId.values()] : byId && typeof byId === 'object' ? Object.values(byId) : [],
    finals = appChoices(values.filter(r => r?.kind === 'APP')).list,
    name = id => {
      const r = recById(byId, id);
      return r?.kind === 'APP' && !isAppTransition(r) ? labelOf(r, finals) : nameOf(r, id) || String(id);
    },
    entry = id => {
      const r = recById(byId, id);
      return String(r?.transition ?? '').trim() || nameOf(r, id) || String(id);
    },
    line = (k, sub) => o[k] === undefined ? undefined : o[k] === null ? null : [name(o[k]), typeof o[sub] === 'string' && o[sub] ? entry(o[
      sub]) : ''].filter(Boolean).join(` ${via} `),
    rwy = rwNum(o.rwy),
    w = windLabel(wind);
  return {
    rwy: rwy ? w ? `${rwy} · ${w}` : rwy : undefined,
    proc: line('sid' in o ? 'sid' : 'star', 'trans'),
    app: line('app', 'appTrans')
  };
}
