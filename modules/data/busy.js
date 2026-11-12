// V3 data — la carte de l'opération en cours que le lanceur refuse de doubler (SOG-0245) : laquelle (en mots, d'après le jeu et le verbe), depuis quand (UTC), où elle en est, si elle répond ; « Voir », « Arrêter » et,
// quand elle ne répond plus, « Libérer ». Le texte vient du lanceur sans confiance : `M.runningOf` le ramène à des champs bornés avant tout dessin. Le geste lui-même (le départ refusé, l'envoi refusé) est à
// follow.js et upload.js ; ici : le dessin, et les trois boutons.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  count,
  esc,
  lang,
  ROUTE,
  S,
  tt
} from './state.js';
import {
  fmtDayZ,
  fmtZ
} from '../../frame/lib/time.js'; // heures en UTC (« 16:30Z »)
import {
  follow
} from './follow.js';
import {
  renderBuild,
  runUnit
} from './panels.js';

/** Le nom de l'opération, en mots : « Procédures · Télécharger (fr, gb) » ; le jeu et le verbe tels que le lanceur les nomme quand l'écran n'a pas leur mot. */
export function opName(r) {
  const set = M.own(TX.groups, r.set) || M.own(TX.setLabel, r.set) || M.own(TX.busy.sets, r.set),
    verb = M.own(TX.busy.verbs, r.verb),
    zones = r.args?.zones?.length ? ` (${r.args.zones.join(', ')})` : '';
  const text = [set ? tt(set) : r.set, verb ? tt(verb) : r.verb].filter(Boolean).join(' · ');
  return (text || '?') + zones;
}
/** L'heure de départ, en UTC (« 16:30Z », avec le jour et le mois quand ce n'est pas aujourd'hui), '' si le lanceur ne l'a pas dite. */
function startedText(r) {
  if (!r.started) return '';
  const d = new Date(r.started * 1000),
    now = new Date();
  return d.toISOString().slice(0, 10) === now.toISOString().slice(0, 10) ? fmtZ(d) : fmtDayZ(d);
}
/** La ligne de vie : « Toujours vivante », « Silencieuse depuis 2:05 min », « Ne répond plus (… ) », « Ne répond plus : son processus a disparu » ; '' si le lanceur n'en dit rien. */
function aliveText(r) {
  const t = M.clock(r.silent ?? 0);
  return r.alive ? tt(TX.busy[r.alive], {
    t
  }) : '';
}
/** La carte de l'opération en cours, pour le panneau `panel` : celle d'un départ ou d'un envoi refusés (S.busy, dans le panneau du geste), ou celle d'une autre opération trouvée en route (S.other, dans tous) ;
 *  '' sans rien à dire, ou quand l'opération est celle dont la marche s'affiche (sauf si elle ne répond plus : la carte dit alors ce qui manque, avec « Libérer »). */
export function busyCardHtml(panel) {
  const fromOther = !S.busy && !!S.other?.id,
    r = S.busy ? !S.busy.panel || S.busy.panel === panel ? S.busy.running : null : fromOther ? M.runningOf(S.other) : null;
  if (!r || r.id === S.busyHidden || S.run && (r.alive === 'alive' || !r.alive)) return '';
  const p = M.runningProgress(r),
    at = startedText(r),
    bad = r.alive === 'quiet' || M.canRelease(
      r), // une opération qui ne donne plus signe de vie : ses lignes d'état sont des avertissements
    lines = [
      [at ? tt(TX.busy.started, {
        t: at
      }) : '', false],
      [r.step ? tt(TX.busy.step, {
        s: r.step
      }) : '', false],
      [p.total > 0 ? `${tt(TX.runCount, { n: runUnit(r.set, { unit: r.unit }, p.done), m: p.total })} · ${p.pct} %` : '', false],
      [aliveText(r), bad],
      [r.cancelling ? tt(TX.busy.cancelling) : '', false],
      [S.busy?.msg ? tt(TX.busy[S.busy.msg], {
        t: M.clock(r.silent ?? 0)
      }) : '', true]
    ].filter(l => l[0]);
  return `<div class="f-card d-busy" data-busy-card${fromOther ? ' data-other' : ''} data-alive="${esc(r.alive || '')}" data-job="${esc(r.id)}"${r.cancelling ? ' data-cancelling' : ''} role="status">
    <p><b data-busy-name>${esc(tt(TX.busy.title, { n: opName(r) }))}</b></p>
    ${lines.map(([l, warn]) => `<p class="${warn ? 'f-warn' : 'f-muted'}" data-busy-line>${esc(l)}</p>`).join('')}
    ${p.total > 0 ? `<div class="d-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><i style="width:${p.pct}%"></i></div>` : ''}
    <p class="d-verbs"><button type="button" data-busy-act="see">${esc(tt(TX.busy.see))}</button>
      <button type="button" data-busy-act="stop"${r.cancelling ? ' disabled' : ''}>${esc(tt(TX.busy.stop))}</button>${M.canRelease(r) ? `
      <button type="button" data-busy-act="release">${esc(tt(TX.busy.release))}</button>` : ''}
      <button type="button" data-busy-act="hide">${esc(tt(TX.busy.hide))}</button></p></div>`;
}
/** Pose la carte d'une opération refusée (un envoi de fichier, par exemple) dans le panneau `panel` ; l'écran reste gris tant qu'elle tourne et la suit (follow). */
export function showBusy(running, panel) {
  if (!running) return;
  S.busy = {
    running,
    panel
  };
  S.busyHidden = null;
  S.other = S.other || {};
  renderBuild();
  if (!S.following) follow();
}
/** Le travail dont la carte parle, d'après S.busy ou S.other. */
const current = () => S.busy?.running || (S.other?.id ? M.runningOf(S.other) : null);
/** « Voir » : relit le travail par son identifiant (ses signes de vie à jour, ou sa fin) et reprend son suivi : le travail d'un jeu connu reprend sa marche dans son panneau. */
async function see(me, r) {
  const v = await S.ctx.launcher.call(`${ROUTE}?id=${encodeURIComponent(r.id)}`);
  if (S !== me) return;
  if (v.ok === false && !v.state) return S.ctx.notify(tt(TX.busy.seeFailed), 'err');
  if (v.state && v.state !== 'running') { // il vient de finir : la carte s'efface, l'écran peut repartir
    S.busy = null;
    S.other = null;
    renderBuild();
    return S.ctx.notify(tt(TX.busy.ended), 'warn');
  }
  if (S.busy) S.busy.running = M.mergeRunning(S.busy.running, M.runningOf({
    ...v,
    id: r.id
  }));
  renderBuild();
  if (!S.following) follow();
}
/** « Arrêter » : l'annulation demandée au lanceur par l'identifiant ; l'opération s'arrête à sa prochaine vérification (« arrêt demandé »). */
async function stop(me, r) {
  const res = await S.ctx.launcher.call(`${ROUTE}/cancel`, {
    id: r.id
  });
  if (S !== me) return;
  if (res.ok === false) return S.ctx.notify(tt(TX.busy.stopFailed), 'err');
  if (S.busy) S.busy.running = {
    ...S.busy.running,
    cancelling: true
  };
  else if (S.other?.id) S.other = {
    ...S.other,
    cancelling: true
  };
  renderBuild();
}
/** « Libérer » : le lanceur rend la main à l'écran pour une opération qui ne répond plus (cette seule poste). 409 « alive » : elle a donné signe de vie, il faut d'abord l'arrêter ; 409 « not-running » ou 410 : elle n'y est plus. */
async function release(me, r) {
  const res = await S.ctx.launcher.call(`${ROUTE}/release`, {
    id: r.id
  });
  if (S !== me) return;
  if (res.ok === false && res.status === 409 && res.reason === 'alive') {
    if (S.busy) S.busy.msg = 'aliveFirst';
    renderBuild();
    return S.ctx.notify(tt(TX.busy.aliveFirst, {
      t: M.clock(r.silent ?? 0)
    }), 'warn');
  }
  if (res.ok === false && !(res.status === 409 && res.reason === 'not-running') && res.status !== 410) return S.ctx.notify(tt(TX.busy
    .releaseFailed), 'err');
  S.busy = null;
  S.other = null; // l'écran peut repartir
  renderBuild();
  S.ctx.notify(tt(res.ok === false ? TX.busy.ended : TX.busy.released), res.ok === false ? 'warn' : 'ok');
}
/** Un bouton de la carte : « Voir », « Arrêter », « Libérer » ou « Masquer » (la carte seule : l'opération continue, l'écran reste gris). */
export function busyAct(act) {
  const me = S,
    r = current();
  if (!r) return;
  if (act === 'hide') {
    S.busyHidden = r.id; // la carte seule s'efface : l'opération continue, l'écran reste gris jusqu'à sa fin
    S.busy = null;
    return renderBuild();
  }
  if (act === 'see') return see(me, r);
  if (act === 'stop') return stop(me, r);
  if (act === 'release' && M.canRelease(r)) return release(me, r);
}
