// Règles des procédures (SID, STAR, approches) partagées par Carburant et le mode choix de la Carte (V3_SPECIFICATION § 10.23, 10.26,
// 10.29 c). Module ES pur : ni état du module, ni texte, ni DOM. Les fiches sont celles d'aerodb (schéma commun : id, kind, name,
// runways, transition, points, status…) ; les pistes sont celles de route.procedures v2 (« 23 », « 05R »).
//
//   rwNum(x), sameRwy(a, b), servesAll(rec), servesRwy(rec, rwy) : la piste et les fiches qui la desservent.
//   nameOf(rec, id) : le nom d'une procédure (null sans nom ou « NONAME » : le texte « sans nom » est celui de l'appelant).
//   conflictsOf(key, rec, choice, byId), orderProcedures(list, key, choice, byId) : les ⚠ et l'ordre des listes, en données.
//   transitionsOf(recs, id) : les transitions d'une SID ou d'une STAR ; appChoices(apps) : les approches listées une fois, avec leurs
//     transitions ; runwayChoices(known, all, ad) : les pistes à proposer pour un terrain.
//
// Transition : conflictsOf et orderProcedures ont d'abord vécu dans frame/lib/current_flight.js (29/10/2026), puis flight_path.js,
// qui les ré-exporte encore (current_flight.js ré-exporte flight_path.js), pour que les imports de la Carte continuent de marcher ;
// les appelants importent d'ici, et la ré-exportation partira quand la Carte aura changé ses imports.

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

/** Les approches d'un terrain, listées une fois : { list, transitionsOf(id) }. list : les approches sans transition et, pour une
 *  approche que l'eAIP ne donne que par point d'entrée (une fiche par entrée, toutes avec une transition), sa fiche finale seule : celle
 *  qu'aucune autre fiche de même nom ne suit (une fiche alimente une autre quand son dernier repère est le premier de l'autre) ; sans
 *  fiche finale reconnue, toutes les fiches d'entrée. transitionsOf(id) : pour une approche donnée par ses entrées, les fiches qui
 *  mènent à sa fiche finale ; sinon ses transitions (même nom, avec une transition), jamais elle-même. */
export function appChoices(apps) {
  const all = apps || [],
    main = all.filter(r => !r.transition),
    named = new Set(main.map(r => nameOf(r))),
    entry = all.filter(r => r.transition && !named.has(nameOf(r))),
    feeds = (a, b) => a !== b && nameOf(a) === nameOf(b) && !!a.points?.at(-1)?.id && a.points.at(-1).id === b.points?.[0]?.id,
    finals = entry.filter(r => !entry.some(x => feeds(r, x)));
  return {
    list: [...main, ...(finals.length ? finals : entry)],
    transitionsOf: id => {
      const chosen = entry.find(r => r.id === id);
      return chosen ? entry.filter(r => feeds(r, chosen)) : transitionsOf(all, id).filter(r => r.id !== id);
    }
  };
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
