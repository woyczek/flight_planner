// V3 data — « Mettre à jour » et les gestes de sélection de la base (SPEC § 5.8, V3_SPECIFICATION § 10.44, SOG-0071, temps 1) : le verbe qui télécharge puis ne reconstruit que les zones périmées (critère PROVISOIRE de model_update.staleZones, en
// attendant base/status du lanceur), « Seulement les périmés », « Tout désélectionner » et la ligne de ce que la sélection pèse. La sélection reste dans l'état de la page (S.ticked) : rien n'en est écrit dans data/ avant un verbe.
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
  knownSources,
  renderBuild,
  selection
} from './panels.js';
import {
  launch,
  settle
} from './follow.js';

/** Les zones de `ids` périmées d'après ce que la page sait aujourd'hui (la publication, le cycle tenu par chaque source datée, à défaut le cycle en vigueur). */
export function staleNow(ids) {
  return M.staleZones({
    ids,
    pubBase: S.d?.pub?.base,
    sources: knownSources(),
    current: S.airac ? S.airac.cycleOf(S.now ?? Date.now()).date : null
  });
}
/** L'état du bouton « Mettre à jour » : celui de « Télécharger » ET de « Construire » (la raison du premier qui est grisé). */
export function updateGate() {
  const g = gateOf('base', selection('base').ids.length);
  return {
    disabled: g.verbs.fetch.disabled || g.verbs.build.disabled,
    reason: g.verbs.fetch.reason || g.verbs.build.reason
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
/** « Seulement les périmés » : la sélection devient les zones de la couverture que le critère dit périmées ; aucune : on le dit, la sélection reste. */
export function selectStale() {
  if (frozen() || !S.d) return;
  const stale = staleNow(buildZones().ids);
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
/** Les raisons du critère en texte : « France : jamais construite ; Royaume-Uni : cycle publié 2610, source 2611 ». */
function whyText(stale) {
  const name = z => M.zoneName(S.d.zones, z, li()),
    cyc = d => (d && S.airac ? M.cycleName(S.airac, d) : '') || d;
  return stale.map(s => `${name(s.zone)} : ${s.why === 'never' ? tt(TX.upd.whyNever) : tt(TX.upd.whyCycle, { p: cyc(s.published), t: cyc(s.target) })}`).join(' ; ');
}
/** « Mettre à jour » : télécharger la sélection (comme « Télécharger »), puis, parmi les zones cochées, UNE question qui nomme celles qu'on va reconstruire, pourquoi et leur poids, et la construction de celles-là seules. Rien de périmé :
 *  on le dit, sans question. Un téléchargement qui échoue ou s'arrête arrête le verbe (sa fin est déjà dite). */
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
  const stale = verdict === 'stop' ? [] : staleNow(sel.ids);
  if (verdict === 'stop' || !stale.length) {
    S.updating = false;
    renderBuild();
    if (verdict !== 'stop') S.ctx.notify(tt(TX.upd.none, {
      n: count('zone', sel.ids.length)
    }), 'ok');
    return;
  }
  const ids = stale.map(s => s.zone);
  S.asking = true; // une opération à la fois : les boutons restent gris pendant la question
  renderBuild();
  const yes = await S.ctx.ask(tt(TX.upd.ask, {
    n: ids.length,
    t: sel.ids.length,
    s: sizeText(ids) || tt(TX.upd.sizeUnknown),
    l: whyText(stale)
  }), {
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
