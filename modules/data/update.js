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
  selection
} from './panels.js';
import {
  launch,
  settle
} from './follow.js';
import {
  fetchStatus,
  reasonText,
  statusKnown
} from './status.js';

/** L'état du bouton « Mettre à jour » : celui de « Télécharger » ET de « Construire », et le lanceur doit connaître base/status (sa raison : la première qui grise). */
export function updateGate() {
  const g = gateOf('base', selection('base').ids.length);
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
    z: waiting.map(w => M.zoneName(S.d.zones, w.zone, li())).join(', ')
  });
}
/** « Mettre à jour » : télécharger la sélection (comme « Télécharger »), lire l'état au lanceur (base/status), puis, parmi les zones cochées, UNE question qui nomme celles qu'on va reconstruire, pourquoi (par raison commune quand elles sont nombreuses), leur poids, et la construction de celles-là
 *  seules. Les zones qui attendent un fichier de Téléchargements sont dites (« Prendre le fichier téléchargé » d'abord) et ne sont pas construites. Rien à reconstruire : une phrase, sans question. Un téléchargement en échec ou arrêté arrête le verbe (sa fin est déjà dite) ; un état
 *  illisible aussi (on le dit : jamais une construction à l'aveugle). */
export async function startUpdate() {
  const me = S;
  if (updateGate().disabled) return;
  const sel = selection('base');
  S.updating = true;
  renderBuild();
  S.lastOp = null;
  await settle(me, await launch('base', 'fetch', M.setArgs('base', 'fetch', sel), sel.ids), true);
  if (S !== me) return;
  const verdict = S.lastOp ? M.chainVerdict('fetch', S.lastOp.out) : 'stop';
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
    return S.ctx.notify(!plan ? tt(TX.upd.noStatus) : plan.waiting.length ? `${tt(TX.upd.none, { n: count('zone', plan.upToDate) })} ${waitingText(plan.waiting)}` : tt(TX.upd.none, {
      n: count('zone', sel.ids.length)
    }), plan ? 'ok' : 'err');
  }
  const ids = plan.build.map(b => b.zone);
  S.asking = true; // une opération à la fois : les boutons restent gris pendant la question
  renderBuild();
  const yes = await S.ctx.ask(tt(TX.upd.ask, {
    n: ids.length,
    t: sel.ids.length,
    s: sizeText(ids) || tt(TX.upd.sizeUnknown),
    l: whyText(plan.build)
  }) + (ids.length >= 10 ? ` ${tt(TX.upd.long)}` : '') + (plan.waiting.length ? ` ${waitingText(plan.waiting)}` : ''), {
    ok: tt(TX.upd.update)
  });
  if (S !== me) return;
  S.asking = false;
  S.updating = false;
  if (!yes) return renderBuild();
  await settle(me, await launch('base', 'build', M.setArgs('base', 'build', {
    ...sel,
    ids
  }), ids), true);
}
