// V3 data — le calcul pur de « ce qui reste à faire ce mois-ci » (SOG-0262, lot B) : la liste du cycle (base/cycle, SOG-0259) lue par model_countries.js devient, par source, trois coches posées par l'outil (téléchargé · construit · publié) et un genre
// (à la main, en retard, à construire, à publier) ; les sources faites sont comptées, celles que leur éditeur n'offre plus sont dites à part et ne comptent pas. Pur : ni page, ni lanceur, ni stockage.

/** Les genres d'une source pas faite, dans l'ordre où la liste les dit : elle attend votre main, elle est en retard, elle est à construire, elle est à publier. */
export const TODO_KINDS = Object.freeze(['hand', 'late', 'build', 'publish']);
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
/** La liste du cycle en trois paquets : { cycle (l'identifiant « 2611 »), total (les sources comptées), done (les sources faites), todo: [{ item, kind }] triées par genre puis dans l'ordre reçu, gone (celles que leur éditeur n'offre plus : hors compte) }. */
export function todoOf(data) {
  const out = {
      cycle: data?.inForce || '',
      total: 0,
      done: [],
      todo: [],
      gone: []
    },
    items = (data?.order || []).map(id => data.items[id]).filter(Boolean);
  for (const it of items) {
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
/** Les pays vers lesquels une source mène : ceux de la liste du cycle qui sont dans la couverture, à défaut ceux que le catalogue lui attribue, dans la couverture ; [] sans (une source commune à tous les pays). Cinq au plus. */
export function zonesOfItem(it, covIds, catZones) {
  const cov = new Set(covIds || []),
    pick = a => (Array.isArray(a) ? a : []).filter(z => cov.has(z));
  const own = pick(it.zones);
  return (own.length ? own : pick(catZones)).slice(0, 5);
}
