// V3 data — le calcul pur de « ce qui reste à faire ce mois-ci » (SOG-0262, lot B) : la liste du cycle (base/cycle, SOG-0259) lue par model_countries.js devient, par source, trois coches posées par l'outil (téléchargé · construit · publié) et un genre
// (à la main, en retard, à construire, à publier) ; les sources faites sont comptées, celles que leur éditeur n'offre plus sont dites à part et ne comptent pas. Pur : ni page, ni lanceur, ni stockage.

/** Les genres d'une source pas faite, dans l'ordre où la liste les dit : elle attend votre main, elle est en retard, elle est à construire, elle est à publier. */
export const TODO_KINDS = Object.freeze(['hand', 'late', 'build', 'publish']);
/** Le régime d'une source calculée sur ce poste (MORA, X-Plane…) : un fait, jamais une ligne « à faire » (SOG-0262, lot D1). */
export const isComputed = reg => reg === 'local' || reg === 'computed';
/** La source n'est-elle plus offerte par son éditeur d'après la liste (son champ `unavailable`, l'état de son téléchargement, ou la liste du haut) ? */
export const isUnavailable = (it, data) => !!it && (!!it.unavailable || it.download.state === 'unavailable' || (data?.unavailable || [])
  .includes(it.id));
/** Les trois coches d'une source : { download: 'yes' | 'no' | 'na', build: 'yes' | 'no' | 'na', publish: 'yes' | 'no' | 'unknown' | 'na' }. 'na' : rien à faire à cette étape (rien à télécharger, aucun pays construit d'après cette source, rien à publier) ;
 *  'unknown' : le lanceur ne dit pas où en est la publication (pas de dépôt) : jamais comptée « à publier ». */
export function stepsState(it) {
  const d = it.download.state,
    b = it.build,
    p = it.publish;
  return {
    download: d === 'done' ? 'yes' : d === 'n/a' ? 'na' : 'no',
    build: b.zones <= 0 ? 'na' : b.upToDate >= b.zones ? 'yes' : 'no',
    publish: p.unpublished > 0 ? 'no' : p.published > 0 ? 'yes' : p.unknown > 0 ? 'unknown' : 'na'
  };
}
/** Le genre d'une source (TODO_KINDS), ou null quand ses trois étapes sont faites. Un fichier à prendre à la main qui n'est pas là (ou qui attend dans Téléchargements) : 'hand' ; un fichier pas à jour ou absent d'une autre source : 'late' ;
 *  le fichier est là mais le pays n'est pas à jour : 'build' ; construit mais pas envoyé : 'publish'. */
export function todoKind(it) {
  const s = stepsState(it);
  if (s.download === 'no') return it.regime === 'hand' ? 'hand' : 'late';
  if (s.build === 'no') return 'build';
  return s.publish === 'no' ? 'publish' : null;
}
/** La liste du cycle en trois paquets : { cycle (l'identifiant « 2611 »), total (les sources comptées), done (les sources faites), todo: [{ item, kind }] triées par genre puis dans l'ordre reçu, gone (celles que leur éditeur n'offre plus : hors compte), computed (les sources calculées sur ce poste : un fait,
 *  jamais une ligne à faire, hors compte) }. `skip(item)` dit celles qui sont calculées (leur régime vient du catalogue quand la liste ne le dit pas). */
export function todoOf(data, skip = null) {
  const out = {
      cycle: data?.inForce || '',
      total: 0,
      done: [],
      todo: [],
      gone: [],
      computed: []
    },
    items = (data?.order || []).map(id => data.items[id]).filter(Boolean);
  for (const it of items) {
    if (isComputed(it.regime) || skip?.(it)) {
      out.computed.push(it);
      continue;
    }
    if (isUnavailable(it, data)) {
      out.gone.push(it);
      continue;
    }
    out.total++;
    const kind = todoKind(it);
    if (kind) out.todo.push({
      item: it,
      kind
    });
    else out.done.push(it);
  }
  out.todo = TODO_KINDS.flatMap(k => out.todo.filter(x => x.kind === k)); // tri stable par genre
  return out;
}
/** Les jeux que le lanceur dit (`datasets`, K207) rangés sous le pli de l'écran qui les montre : l'identifiant du pli → les jeux, le premier est le jeu principal du pli. */
export const DATASET_FOLD = Object.freeze({
  proc: Object.freeze(['procedures']),
  vfr: Object.freeze(['vfr']),
  aircraft: Object.freeze(['aircraft', 'sheets']),
  weather: Object.freeze(['weather'])
});
/** Le compte du cycle : les sources de la base comptées par todoOf, plus UN par autre jeu que le lanceur dit (`data.datasets`) ; `n/a` (« existe, sans échéance ») compte fait. Sans `datasets`, le compte de la base seule. { done, total }. */
export function cycleCount(r, data) {
  const ds = data?.datasets || [];
  return {
    done: r.done.length + ds.filter(d => d.state !== 'todo').length,
    total: r.total + ds.length
  };
}
/** Ce que les jeux disent d'un pli de l'écran : { k: 'todo' | 'ok', n (jeux à faire), ds (le jeu à dire : le premier à faire, sinon le principal), secondary (ce jeu n'est pas le principal du pli) } ; null quand le lanceur n'en dit aucun (l'écran garde alors l'état tiré de la publication). */
export function foldDataset(data, fold) {
  const ids = Object.hasOwn(DATASET_FOLD, fold) ? DATASET_FOLD[fold] : null,
    mine = ids ? ids.map(id => (data?.datasets || []).find(d => d.id === id)).filter(Boolean) : [];
  if (!mine.length) return null;
  const todo = mine.filter(d => d.state === 'todo'),
    ds = todo[0] || mine[0];
  return {
    k: todo.length ? 'todo' : 'ok',
    n: todo.length,
    ds,
    all: mine, // tous les jeux du pli : la ligne repliée dit la date utile de chacun
    secondary: ds.id !== ids[0]
  };
}
/** Les autres jeux rangés comme les sources de la liste : { todo (état `todo` : une ligne avec son geste et sa raison), done (état `up-to-date` : parmi les faits) } ; un jeu `n/a` (« existe, sans échéance ») n'a pas de ligne : il compte fait dans l'en-tête (cycleCount) sans être listé.
 *  L'en-tête « n faits sur m » et le bloc disent ainsi la même chose : m moins les lignes à faire = n. */
export function datasetLines(data) {
  const ds = data?.datasets || [];
  return {
    todo: ds.filter(d => d.state === 'todo'),
    done: ds.filter(d => d.state === 'up-to-date')
  };
}
/** Les pays vers lesquels une source mène : ceux de la liste du cycle qui sont dans la couverture, à défaut ceux que le catalogue lui attribue, dans la couverture ; [] sans (une source commune à tous les pays). Cinq au plus. */
export function zonesOfItem(it, covIds, catZones, max = 5) {
  const cov = new Set(covIds || []),
    pick = a => (Array.isArray(a) ? a : []).filter(z => cov.has(z));
  const own = pick(it.zones);
  return (own.length ? own : pick(catZones)).slice(0, max);
}
