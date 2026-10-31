// V3 data — suit les travaux du lanceur (SPEC § 11) : départ, suivi, fin unique (finishOp) et plan unique (finishPlan), refus, prise du fichier téléchargé. Ne dessine rien
// lui-même : il écrit l'état et demande le dessin à panels.js.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  ask,
  count,
  kind,
  lang,
  ROUTE,
  S,
  tt
} from './state.js';
import {
  journalWrite,
  load
} from './screen.js';
import {
  buildZones,
  fetchSummary,
  gateOf,
  openGroup,
  pickupAsk,
  pickupSummary,
  purgeAsk,
  purgeSummary,
  renderBuild,
  selection,
  sheetsSummary,
  summary
} from './panels.js';

/** Une seconde de plus : met à jour le seul temps écoulé de la marche (dans le panneau de son jeu). */
function tick() {
  const run = S?.run,
    el = S?.body?.querySelector('[data-running] [data-elapsed]');
  if (run && el) el.textContent = tt(TX.elapsed, {
    t: M.clock((Date.now() - run.t0) / 1e3)
  });
}
/** Arrête le minuteur du temps écoulé. */
export function stopTimer() {
  clearInterval(S?.timer);
  if (S) S.timer = 0;
}
/** Commence une marche (la nôtre ou un travail trouvé en route) : jeu, verbe, éléments, minuteur, groupe ouvert. `dry` : le plan d'une purge ou
 *  d'une publication de fiches ; `args` : les arguments du travail réel (sans dry), que la question d'un plan renvoie une fois confirmée. */
function beginRun(ids, ctrl, set = 'base', verb = 'build', dry = false, args = null) {
  S.run = {
    phase: 'running',
    t0: Date.now(),
    ctrl,
    set,
    verb,
    dry,
    args
  };
  S.ids = ids;
  S.view = null;
  S.result = null;
  stopTimer();
  S.timer = setInterval(tick, 1000);
  openGroup(set, verb);
}
/** Les éléments d'une vue de travail d'un jeu (les zones, les États, les types, le cycle), dans l'ordre de la vue. */
const viewIds = (set, v) => Object.keys(M.normView(set, v)?.zones || {});
/** Une vue du travail arrive : elle remplace la précédente et le panneau se redessine. Un travail connu (n'importe quel jeu et verbe : construction,
 *  téléchargement, purge, fiches) trouvé en route (resume) est adopté à sa première vue, avec son jeu et son verbe ; le travail d'une autre
 *  opération n'est que signalé. */
function onView(me, v, ctrl) {
  if (S !== me || !v) return;
  const op = M.viewOp(v);
  if (!op) {
    S.other = v;
    return renderBuild();
  }
  if (!S.run) beginRun(viewIds(op.set, v), ctrl, op.set, op.verb, M.opDry(v));
  S.view = v;
  if (S.ids.length === 0) S.ids = viewIds(S.run.set, v);
  renderBuild();
}
/** Fin d'un travail, quel que soit son jeu et son verbe : l'état de la marche est rendu, puis la fin propre au verbe (construction,
 *  téléchargement, plan de purge, purge, plan et publication de fiches). `live` : la fin s'est produite sous nos yeux (sinon c'est celle d'un
 *  travail déjà fini). */
async function endRun(me, final, live) {
  const run = S.run,
    op = M.viewOp(final),
    set = run?.set || op?.set || 'base',
    verb = run?.verb || op?.verb || 'build',
    dry = (verb === 'purge' || verb === 'publish' || verb === 'pickup') && (run ? run.dry : M.opDry(final)),
    seconds = run ? (Date.now() - run.t0) / 1e3 : null;
  if (!S.ids.length) S.ids = viewIds(set, final);
  stopTimer();
  S.run = null;
  S.other = null;
  S.view = final;
  if (dry && !live) return renderBuild(); // le plan terminé avant l'ouverture : il n'est plus à poser
  if (verb === 'publish') return dry ? endSheetsPlan(me, final) : endSheets(final, live, seconds);
  if (verb === 'pickup') return dry ? endPickupPlan(me, final) : endPickup(final, live, seconds);
  if (verb === 'fetch') return endFetch(final, live, seconds, set);
  if (verb === 'purge') return dry ? endPlan(me, final, run) : endPurge(final, live, seconds, set);
  return endBuild(final, live, seconds, set);
}
/** La fin commune d'une opération réelle (construction, téléchargement, purge, prise du fichier, fiches) : le résultat dans le panneau du jeu et son dessin, UNE notification (seulement si la fin
 *  s'est produite sous nos yeux, `live`), l'entrée du journal, puis la relecture de ce qui est publié. Chaque verbe donne ce qui le distingue : `sm` (son résumé : texte et niveau), `note` (les
 *  phrases de la notification), `entry` (l'entrée de son constructeur) et `reload` (faux : la prise du fichier ne change rien de publié). Dans la chaîne « Tout mettre à jour » (S.chain) la fin se
 *  tait : ni notification, ni entrée, ni relecture par opération ; la chaîne lit S.lastOp. */
async function finishOp(set, verb, out, live, {
  sm,
  note,
  entry,
  reload = true
}) {
  S.result = {
    set,
    verb,
    out
  };
  renderBuild();
  const quiet = !!S.chain;
  S.lastOp = {
    set,
    verb,
    out,
    text: sm.text
  };
  if (live && !quiet) S.ctx.notify(note.filter(Boolean).join(' · '), sm.level);
  if (!quiet) journalWrite(entry);
  if (live && !quiet && reload) await load(); // les états des lignes ont changé : même chemin de lecture que l'ouverture
}
/** L'entrée du journal d'une opération réelle d'un jeu : celle de son verbe (M.setEntry), pour les éléments du travail (S.ids) et la durée de la marche. */
const opEntry = (set, verb, out, final, seconds) => M.setEntry(set, verb, {
  at: Date.now(),
  ids: S.ids,
  seconds,
  out,
  job: final.job || final.id
});
/** Fin d'une construction : le résumé et ses notes dans le panneau. */
async function endBuild(final, live, seconds, set = 'base') {
  const out = M.setOutcome(set, 'build', final).out,
    sm = summary(out, set);
  return finishOp(set, 'build', out, live, {
    sm,
    note: [sm.text, ...(sm.notes || [])],
    entry: opEntry(set, 'build', out, final, seconds)
  });
}
/** Fin d'un téléchargement : le résumé, les sources manuelles et les lignes dans le panneau ; la notification dit aussi les fichiers hors synchronisation (journal : verbe « download »). */
async function endFetch(final, live, seconds, set = 'base') {
  const out = M.setOutcome(set, 'fetch', final).out,
    sm = fetchSummary(out, set);
  return finishOp(set, 'fetch', out, live, {
    sm,
    note: [sm.text, sm.outside],
    entry: opEntry(set, 'fetch', out, final, seconds)
  });
}
/** Fin d'une purge réelle : le résumé et les phrases des avertissements dans le panneau. */
async function endPurge(final, live, seconds, set = 'base') {
  const out = M.setOutcome(set, 'purge', final).out,
    sm = purgeSummary(out);
  return finishOp(set, 'purge', out, live, {
    sm,
    note: [sm.text, ...sm.notes],
    entry: opEntry(set, 'purge', out, final, seconds)
  });
}
/** Fin d'une publication de fiches réelle : le résumé dans le panneau. */
async function endSheets(final, live, seconds) {
  const out = M.sheetsOutcome(final),
    sm = sheetsSummary(out);
  return finishOp(M.SHEETS.set, M.SHEETS.verb, out, live, {
    sm,
    note: [sm.text],
    entry: M.sheetsEntry({
      at: Date.now(),
      seconds,
      out,
      job: final.job || final.id
    })
  });
}
/** Fin d'une prise réelle : le résumé et le conseil « Lancez maintenant Construire » dans le panneau, avec les zips du plan que la prise n'a pas lancés ; rien de publié ne change (pas de relecture). */
async function endPickup(final, live, seconds) {
  const out = {
      ...M.setOutcome('base', M.PICKUP.verb, final).out,
      blocked: S.pickupBlocked || []
    },
    sm = pickupSummary(out);
  S.pickupBlocked = null;
  return finishOp('base', M.PICKUP.verb, out, live, {
    sm,
    note: [sm.text, sm.hint],
    entry: opEntry('base', M.PICKUP.verb, out, final, seconds),
    reload: false
  });
}
/** La fin commune du plan à blanc d'une opération (purge, fiches, prise du fichier ; jamais journalisé) : un plan arrêté ne dit rien ; sans rien à faire (`result` : ce qu'on montre à la place, avec
 *  `note` et `level` pour la notification) on le dit sans question ; sinon UNE question (`question`, confirmée par `ok`) et `go(yes)` : la suite choisie (lancer l'opération réelle si oui). */
async function finishPlan(me, {
  cancelled,
  result,
  note,
  level,
  question,
  ok,
  go
}) {
  if (cancelled) { // « Arrêter » pendant le plan : rien n'a été fait
    S.result = null;
    return renderBuild();
  }
  if (result) {
    S.result = result;
    renderBuild();
    S.ctx.notify(note, level);
    return;
  }
  S.result = null;
  S.asking = true; // les boutons restent gris pendant la question : une opération à la fois
  renderBuild();
  const yes = await S.ctx.ask(question, {
    ok
  });
  if (S !== me) return;
  S.asking = false;
  if (!yes) renderBuild(); // non : rien n'est fait, rien n'est dit
  return go(yes);
}
/** Fin du plan d'une purge : rien à retirer, on le dit sans question ; sinon UNE question (les fichiers, la taille, les éléments, les phrases des avertissements) et, si oui, la purge réelle sur les
 *  mêmes éléments. Un plan arrêté, échoué ou interrompu ne pose aucune question. `run` : la marche du plan (son jeu et les arguments du travail réel). */
async function endPlan(me, final, run) {
  const set = run?.set || 'base',
    out = M.setOutcome(set, 'purge', final).out,
    ask = out.kind === 'done' && !out.nothing,
    sm = ask ? null : purgeSummary(out, out.kind === 'done');
  return finishPlan(me, {
    cancelled: out.kind === 'cancelled',
    result: ask ? null : {
      set,
      verb: 'purge',
      out,
      ...(out.kind === 'done' ? {
        nothing: true
      } : {})
    },
    note: sm && [sm.text, ...sm.notes].join(' · '),
    level: sm?.level,
    question: ask ? purgeAsk(out, set) : '',
    ok: tt(TX.purge),
    go: async yes => {
      if (!yes) return;
      const real = run?.args || M.setArgs(set, 'purge', {
        ids: S.ids
      });
      await settle(me, await launch(set, 'purge', set === 'base' ? real : {
        ...real,
        dry: false
      }, S.ids), true);
    }
  });
}
/** Fin du plan d'une publication de fiches (aircraft/publish à blanc) : rien à copier ni à retirer, on le dit sans question ; sinon UNE question (les fiches à copier et à retirer) et, si oui, la
 *  publication réelle, sans dry. Un plan arrêté, échoué ou interrompu ne pose aucune question. */
async function endSheetsPlan(me, final) {
  const out = M.sheetsOutcome(final),
    plan = M.sheetsPlan(final),
    ask = out.kind === 'done' && !!(plan.copied || plan.removed),
    shown = out.kind === 'done' ? {
      ...out,
      copied: 0,
      removed: 0
    } : out,
    sm = ask ? null : sheetsSummary(shown, out.kind === 'done');
  return finishPlan(me, {
    cancelled: out.kind === 'cancelled',
    result: ask ? null : {
      set: M.SHEETS.set,
      verb: M.SHEETS.verb,
      out: shown,
      nothing: out.kind === 'done'
    },
    note: sm?.text,
    level: sm?.level,
    question: ask ? tt(TX.sheetsAsk, {
      c: count('sheet', plan.copied),
      r: count('sheet', plan.removed),
      s: M.fmtBytes(plan.bytes, lang())
    }) : '',
    ok: tt(TX.publish),
    go: async yes => {
      if (yes) await settle(me, await launch(M.SHEETS.set, M.SHEETS.verb, {
        dry: false
      }, []), true);
    }
  });
}
/** Un départ refusé (409 : une autre opération ; 429 : trop tôt ; 404 : lanceur ancien…) : la phrase, une notification. Après un
 *  409 on suit l'opération qui tourne, pour que le bouton redevienne actif à sa fin. */
function refused(me, r) {
  const f = M.refusal(r),
    set = S.run?.set || 'base',
    verb = S.run?.verb || 'build';
  stopTimer();
  S.run = null;
  S.result = {
    set,
    verb,
    refused: f
  };
  if (f.key === 'busy') S.other = S.other || {}; // une opération tourne : le bouton reste gris pendant qu'on la rejoint
  renderBuild();
  S.ctx.notify(tt(TX.refused[f.key], {
    n: f.wait
  }), 'err');
  if (f.key === 'busy') follow();
}
/** Termine d'après ce que rend ctx.launcher.job ou .resume : une fin (état connu), un arrêt demandé (on attend la vraie fin du
 *  travail), un suivi détaché (démontage : rien), ou un refus. */
export async function settle(me, r, live = true) {
  if (S !== me || !r || r.detached) return;
  if (r.cancelled && !r.state) {
    // « Arrêter » : le cadre a envoyé l'annulation et rend la main ; la construction finit sa zone en cours, on suit sa vraie fin
    if (S.run) {
      S.run.phase = 'stopping';
      renderBuild();
    }
    const e = await S.ctx.launcher.resume(ROUTE, {
      onProgress: v => onView(me, v)
    });
    if (S !== me) return;
    return endRun(me, e?.state && e.state !== 'running' ? e : {
      ...S.view,
      state: 'cancelled',
      job: r.job
    }, live);
  }
  if (r.state && r.state !== 'running') {
    if (M.viewOp(r) || S.run) return endRun(me, r, live);
    S.other = null; // la fin d'une autre opération : le bouton redevient actif
    return renderBuild();
  }
  if (r.aborted) return;
  return refused(me, r);
}
/** Suit le travail connu (n'importe quel jeu et verbe) que le lanceur fait tourner (page rechargée, ou départ refusé pour cause d'opération
 *  en cours) ; si le dernier s'est terminé, en dit la fin. Ne bloque pas le montage. */
export async function follow() {
  const me = S,
    L = S.ctx.launcher;
  if (!L) return;
  const ctrl = new AbortController();
  const r = await L.resume(ROUTE, {
    onProgress: v => onView(me, v, ctrl),
    signal: ctrl.signal
  });
  if (S !== me || !r) return;
  if (r.ok === false && !r.state && !r.cancelled) return; // pas de réponse : l'écran reste tel quel
  S.other = null;
  return settle(me, r, !!S.run);
}
/** Lance un travail d'un jeu sur le lanceur (regen/job) et le suit par ses vues : la marche commence aussitôt ; rend la fin que
 *  ctx.launcher.job donne (à passer à settle). `args` : le corps du travail (avec dry pour un plan) ; `plain` : les arguments du travail réel
 *  (sans dry) que la fin d'un plan réutilise. */
export async function launch(set, verb, args, ids, dry = false, plain = null) {
  const me = S,
    ctrl = new AbortController();
  beginRun(ids, ctrl, set, verb, dry, plain);
  renderBuild();
  return S.ctx.launcher.job(ROUTE, {
    set,
    verb,
    args
  }, {
    onProgress: v => onView(me, v, ctrl),
    signal: ctrl.signal
  });
}
/** Un geste sur un panneau : « Télécharger » (fetch), « Construire » (build) ou « Purger » (purge, d'abord le plan à blanc dont la fin pose la
 *  question) d'un jeu, ou « Publier » les fiches (aircraft/publish, plan à blanc puis la copie). Rien ne part si le bouton est gris ; des types
 *  OACI refusés sont dits dans le panneau, sans appel au lanceur. */
export async function startOp(set, verb) {
  const me = S,
    sheets = set === M.SHEETS.set && verb === M.SHEETS.verb,
    sel = sheets ? {
      ids: []
    } : selection(set);
  if (sheets) {
    if (gateOf(set, undefined, [verb]).verbs[verb].disabled) return;
  } else {
    const gate = gateOf(set, M.SETS[set].free ? undefined : sel.ids.length);
    if (gate.verbs[verb].disabled) return;
  }
  if (sel.bad?.length && verb !==
    'purge') { // un type OACI refusé (la purge ne prend pas de types) : on le dit, on n'appelle pas le lanceur
    S.codesBad = sel.bad;
    renderBuild();
    S.ctx.notify(tt(TX.codesBad, {
      c: sel.bad.join(', ')
    }), 'err');
    return;
  }
  if (set === 'vfr' && !sel.cycle) return; // le cycle en vigueur est inconnu : rien à demander
  const args = sheets ? {} : M.setArgs(set, verb, sel),
    dry = verb === 'purge' || sheets,
    // les appareils : les lignes d'une construction ou d'un téléchargement sont les trois étapes ; la purge ne compte rien par élément
    ids = set === 'aircraft' ? verb === 'purge' || sheets ? [] : M.SETS.aircraft.steps : sel.ids;
  await settle(me, await launch(set, verb, dry ? {
    ...args,
    dry: true
  } : args, ids, dry, args), true);
}
/** « Prendre le fichier téléchargé » : le plan d'abord (base/pickup à blanc, dry envoyé explicitement), dont la fin pose la question puis la prise réelle. `zonesAttr` :
 *  les zones des sources du résultat d'un téléchargement (séparées par des virgules), sinon les zones cochées. Rien ne part si le bouton est gris. */
export async function startPickup(zonesAttr) {
  const me = S,
    known = new Set(S.d?.cov?.ids || []),
    zones = zonesAttr ? zonesAttr.split(',').filter(z => known.has(z)) : buildZones().ticked;
  if (!zones.length || gateOf('base', zones.length, [M.PICKUP.verb]).verbs[M.PICKUP.verb].disabled) return;
  await settle(me, await launch('base', M.PICKUP.verb, {
    zones,
    dry: true
  }, zones, true, {
    zones
  }), true);
}
/** Fin du plan d'une prise (jamais journalisé) : rien à prendre, ou aucun zip dont le nom soit dans la règle (un zip hors de la règle est dit mais jamais lancé : le lanceur prendrait « le plus récent » sans
 *  contrôle), on le dit sans question ; sinon UNE question (les zips trouvés, ce qui manque, où vont les fichiers) et, si oui, la prise réelle (dry false) sur les zones et les zips du plan montré, jamais
 *  relu. Un plan arrêté ne pose aucune question. */
async function endPickupPlan(me, final) {
  const out = M.setOutcome('base', M.PICKUP.verb, final).out,
    split = M.pickupSplit(out.taken),
    shown = {
      ...out,
      taken: split.ready,
      blocked: split.blocked
    },
    ask = out.kind !== 'cancelled' && out.taken.length > 0 && split.ready.length > 0,
    res = out.taken.length ? {
      ...shown,
      kind: 'blocked'
    } : out,
    sm = ask ? null : pickupSummary(res);
  if (ask) {
    S.pickupBlocked = split.blocked;
    S.pickupPlan = {
      zones: split.zones,
      zips: split.zips
    }; // le plan montré : la prise réelle n'envoie que ces zips (nom et taille), jamais un plan relu ; le lanceur refuse la source dont le zip a changé entre-temps
  }
  return finishPlan(me, {
    cancelled: out.kind === 'cancelled',
    result: ask ? null : {
      set: 'base',
      verb: M.PICKUP.verb,
      out: res
    },
    note: sm?.text,
    level: sm?.level,
    question: ask ? pickupAsk(shown) : '',
    ok: tt(TX.pickup),
    go: async yes => {
      const plan = S.pickupPlan;
      S.pickupPlan = null;
      if (yes && plan) await settle(me, await launch('base', M.PICKUP.verb, {
        zones: plan.zones,
        dry: false,
        zips: plan.zips
      }, plan.zones), true);
    }
  });
}
