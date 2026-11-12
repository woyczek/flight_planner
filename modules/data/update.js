// V3 data — « Mettre à jour » et les gestes de sélection de la base (SPEC § 5.8, § 5.9, V3_SPECIFICATION § 10.44, SOG-0071) : le verbe qui télécharge puis ne reconstruit que les zones que le LANCEUR dit pas à jour (base/status) et constructibles, « Seulement les périmés »,
// « Tout désélectionner » et la ligne de ce que la sélection pèse. La sélection reste dans l'état de la page (S.ticked) : rien n'en est écrit dans data/ avant un verbe.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  count,
  frozen,
  lang,
  li,
  S,
  tt
} from './state.js';
import {
  buildZones,
  gateOf,
  renderBuild,
  selectionOf
} from './panels.js';
import {
  launch,
  runChunks,
  settle
} from './follow.js';
import {
  fetchStatus,
  reasonText,
  statusKnown
} from './status.js';

/** Ce que « Mettre à jour » prend : { ids, partial, known, counts, plan, todo, n }. La sélection est PARTIELLE quand des zones sont cochées et moins que toute la couverture (0 < cochées < couverture) : le bouton n'agit alors que sur les cochées ; sinon (rien de coché, ou tout coché : le défaut), sur TOUTE la couverture.
 *  `counts` : le bilan des zones prises (M.balanceOf) et `plan` ce que le bouton va faire (M.downloadPlan), tous deux null sans état du lanceur ; `todo` : les zones que le bouton traite (à télécharger ou à reconstruire : celles à reconstruire, en échec ou sans état ; une zone qui attend un fichier déposé à la main n'en est pas) ; `n` : leur nombre, null sans état du lanceur. */
export function updateScope() {
  const {
    ids,
    ticked
  } = buildZones(), partial = ticked.length > 0 && ticked.length < ids.length, scope = partial ? ticked : ids,
    known = !!S.status && statusKnown(),
    counts = known ? M.balanceOf(S.status, scope) : null,
    plan = known ? M.downloadPlan(S.status, scope) : null,
    todo = plan ? [...new Set([...plan.fetch, ...plan.build])] : [];
  return {
    ids: scope,
    partial,
    known,
    counts,
    plan,
    todo,
    n: known ? todo.length : null
  };
}
/** L'état du bouton « Mettre à jour » : celui de « Télécharger » ET de « Construire », et le lanceur doit connaître base/status (sa raison : la première qui grise). `ids` : les zones d'un paquet ou d'une zone à réessayer ; sans elles, la portée du bouton (updateScope : toute la couverture quand rien n'est coché). */
export function updateGate(ids = null) {
  const g = gateOf('base', (ids || updateScope().ids).length);
  return {
    disabled: g.verbs.fetch.disabled || g.verbs.build.disabled || !statusKnown(),
    reason: g.verbs.fetch.reason || g.verbs.build.reason || (statusKnown() ? null : 'unknown-verb')
  };
}
/** La taille d'une sélection en texte (« 78,0 Mo ») ; « + » quand certaines zones n'ont pas de taille connue ; '' sans aucune taille. */
export function sizeText(ids) {
  const s = M.sizeKb(ids, S.d?.zones);
  return s.known ? `${M.fmtBytes(s.kb * 1024, lang())}${s.known < s.total ? '+' : ''}` : '';
}
/** La ligne de ce que pèse la sélection : « Sélection : 14 zones · 78,0 Mo » (le nombre et la taille se disent avant tout verbe) ; vide sans zone cochée. */
export function selectionLine() {
  const ids = buildZones().ticked;
  if (!ids.length) return tt(TX.upd.selNothing);
  const size = sizeText(ids);
  return tt(TX.upd.selLine, {
    z: count('zone', ids.length)
  }) + (size ? ` · ${size}` : '');
}
/** « Seulement les périmés » : lit l'état des zones de la couverture au lanceur, puis la sélection devient les zones qui ne sont pas à jour et que la construction peut traiter ; aucune : on le dit, la sélection reste ; l'état illisible : on le dit aussi. */
export async function selectStale() {
  if (frozen() || !S.d || !statusKnown()) return;
  const me = S,
    st = await fetchStatus(buildZones().ids);
  if (S !== me) return;
  if (!st) return S.ctx.notify(tt(TX.upd.noStatus), 'err');
  const stale = M.updatePlan(st, buildZones().ids).build;
  if (!stale.length) return S.ctx.notify(tt(TX.upd.noStale), 'ok');
  S.ticked = new Set(stale.map(s => s.zone));
  renderBuild();
}
/** « Tout désélectionner » : aucune zone cochée. */
export function selectNone() {
  if (frozen() || !S.d) return;
  S.ticked = new Set();
  renderBuild();
}
/** Les raisons de la construction en texte : regroupées par raison quand elles sont communes à plusieurs zones (« 45 zones : construites avec un ancien analyseur (v21, actuel v22) »), sinon zone par zone (« France : jamais construite »). */
function whyText(build) {
  const name = z => M.zoneName(S.d.zones, z, li());
  return M.groupReasons(build.map(b => ({
    zone: b.zone,
    reasons: b.reasons
  }))).map(g => g.zones.length > 3 ? tt(TX.upd.whyMany, {
    n: count('zone', g.zones.length),
    r: reasonText(g.reason)
  }) : g.zones.map(z => `${name(z)} : ${reasonText(build.find(b => b.zone === z).reasons[0] || g.reason)}`).join(' ; ')).join(' ; ');
}
/** Les zones qui attendent un fichier de Téléchargements (pas constructibles) en une phrase ; '' sans. */
function waitingText(waiting) {
  if (!waiting.length) return '';
  return tt(TX.upd.waiting, {
    n: count('zone', waiting.length),
    z: waiting.map(w => `${M.zoneName(S.d.zones, w.zone, li())} : ${w.reasons[0] ? reasonText(w.reasons[0]) : ''}`).join(' ; ')
  });
}
/** Les zones qui attendent la coche d'usage personnel (rien à télécharger ni à reconstruire) en une phrase ; '' sans. */
function personalText(personal) {
  return personal.length ? tt(TX.bal.personal[personal.length === 1 ? 0 : 1], {
    n: count('zone', personal.length)
  }) + '.' : '';
}
/** La ligne d'avant le départ : « 3 zones à télécharger, 5 zones à reconstruire, 52 zones déjà à jour » (les parts vides ne sont pas dites). */
export function planText(dp) {
  const z = n => count('zone', n);
  return [
    [dp.fetch, TX.upd.planDl],
    [dp.build, TX.upd.planBuild],
    [dp.upToDate, TX.upd.planOk],
    [dp.waiting, TX.upd.planWait],
    [dp.personal, TX.upd.planTick]
  ].filter(([l]) => l.length).map(([l, t]) => tt(t, {
    z: z(l.length)
  })).join(', ');
}
/** « Mettre à jour » : lit d'abord l'état (base/status), saute les zones à jour et ne télécharge que celles dont les sources du cycle ne sont pas là (comme « Télécharger ») (comme « Télécharger »), lire l'état au lanceur (base/status), puis, parmi les zones cochées, UNE question qui nomme celles qu'on va reconstruire, pourquoi (par raison commune quand elles sont nombreuses), leur poids, et la construction de celles-là
 *  seules. Les zones qui attendent un fichier de Téléchargements sont dites (« Prendre le fichier téléchargé » d'abord) et ne sont pas construites. Rien à reconstruire : une phrase, sans question. Un téléchargement en échec ou arrêté arrête le verbe (sa fin est déjà dite) ; un état
 *  illisible aussi (on le dit : jamais une construction à l'aveugle). */
export async function startUpdate(zones = null) {
  const me = S;
  if (updateGate(zones).disabled) return;
  const sel = selectionOf(zones || updateScope()
    .ids
  ); // `zones` : le « Mettre à jour » d'un paquet (SOG-0188), les seuls pays de ce paquet qui sont dans la couverture ; sans elles, la portée du bouton (les cochées si la sélection est partielle, sinon toute la couverture) ; la sélection cochée ne bouge pas
  S.updating = true;
  renderBuild();
  S.lastOp = null;
  // 1) l'état d'abord (SOG-0180) : « Mettre à jour » ne refait que ce qui n'est pas à jour — une zone à jour est sautée, une zone dont les sources du cycle sont là n'est pas téléchargée de nouveau
  const st0 = await fetchStatus(sel.ids);
  if (S !== me) return;
  if (!st0) {
    S.updating = false;
    renderBuild();
    return S.ctx.notify(tt(TX.upd.noStatus), 'err');
  }
  const dp = M.downloadPlan(st0, sel.ids);
  if (dp.fetch.length || dp.build.length) S.ctx.notify(planText(dp), 'info'); // la ligne d'avant le départ : ce qui va être fait
  let verdict = 'ok';
  if (dp.fetch
    .length
  ) { // 2) le téléchargement des seules zones qui en ont besoin ; un échec (partiel) ne retient pas la suite : les zones sont indépendantes (SOG-0180)
    const fsel = {
      ...sel,
      ids: dp.fetch
    };
    verdict = fsel.ids.length > M.MAX_ZONES ? await runChunks(me, 'base', 'fetch', fsel) : (await settle(me, await launch('base', 'fetch',
      M.setArgs('base', 'fetch', fsel), fsel.ids), true), S.lastOp ? M.chunkVerdict('fetch', S.lastOp.out) : 'stop');
  }
  if (S !== me) return;
  if (verdict === 'stop') {
    S.updating = false;
    return renderBuild();
  }
  const st = await fetchStatus(sel.ids);
  if (S !== me) return;
  const plan = st ? M.updatePlan(st, sel.ids) : null;
  if (!plan || !plan.build.length) {
    S.updating = false;
    renderBuild();
    return S.ctx.notify(!plan ? tt(TX.upd.noStatus) : [plan.upToDate || !plan.unknown ? tt(TX.upd
      .none, { // le nombre dit est celui des zones que le lanceur a dites à jour (jamais toutes les cochées)
        n: count('zone', plan.upToDate)
      }) : '', plan.waiting.length ? waitingText(plan.waiting) : '', personalText(plan.personal), plan.unknown ? tt(TX.upd
      .noState, {
        n: count('zone', plan.unknown)
      }) : ''].filter(Boolean).join(' '), plan ? plan.unknown ? 'warn' : 'ok' : 'err');
  }
  const ids = plan.build.map(b => b.zone);
  S.asking = true; // une opération à la fois : les boutons restent gris pendant la question
  renderBuild();
  const yes = await S.ctx.ask(tt(TX.upd.ask, {
    n: ids.length,
    t: sel.ids.length,
    s: sizeText(ids) || tt(TX.upd.sizeUnknown),
    l: whyText(plan.build)
  }) + (ids.length > M.MAX_ZONES ? ` ${tt(TX.chunksAsk, { n: ids.length, k: M.chunksOf(ids).length, z: M.MAX_ZONES })}` : '') + (ids.length >= 10 ? ` ${tt(TX.upd.long)}` : '') + (plan.waiting.length ? ` ${waitingText(plan.waiting)}` : ''), {
    ok: tt(TX.upd.update)
  });
  if (S !== me) return;
  S.asking = false;
  S.updating = false;
  if (!yes) return renderBuild();
  if (ids.length > M.MAX_ZONES) return void await runChunks(me, 'base', 'build', {
    ...sel,
    ids
  });
  await settle(me, await launch('base', 'build', M.setArgs('base', 'build', {
    ...sel,
    ids
  }), ids), true);
}
/** Le lien `#data?zone=<id>` (SOG-0143 : « cette zone est à reconstruire ») : à demander avant le premier dessin ; il ouvre le groupe de la base et, si la zone est dans la couverture, la sélection devient cette zone seule. Une seule fois par montage. */
export function wantZone() {
  const z = S.ctx.query?.zone;
  if (S.zoneAsked || typeof z !== 'string' || !/^[a-z0-9]{2,8}$/.test(z)) return;
  S.zoneAsked = true;
  S.zoneLink = z;
  S.manual.base = true;
  if (S.d.cov.ids.includes(z)) S.ticked = new Set([z]);
}
/** Après ce dessin : amène à « Mettre à jour » (la zone cochée), ou dit que la zone n'est pas dans la couverture et amène à « Ajouter un pays ». Une seule fois. */
export function showZone() {
  const z = S.zoneLink;
  if (!z) return;
  S.zoneLink = null;
  const name = M.zoneName(S.d.zones, z, li()),
    inCov = S.d.cov.ids.includes(z),
    el = inCov ? S.body?.querySelector('[data-build] [data-verb="update"]') : S.body?.querySelector('[data-coverage]');
  el?.scrollIntoView({
    block: 'center'
  });
  S.ctx.notify(tt(inCov ? TX.upd.zoneLink : TX.upd.zoneLinkOut, {
    z: name
  }), inCov ? 'info' : 'warn');
}
