// V3 frame/lib — « le poste est occupé » (SOG-0658, décision de l'ergonome) : le lanceur ne fait qu'une opération longue à la fois ; un refus 409 « busy » porte `running` (l'opération en cours, que
// launcher.js `runningOf` ramène à des champs bornés), et Carburant et la Météo le jetaient. Ici, UNE phrase et UNE demande en attente, pour toute la suite. Calcul pur (aucune page) : les
// minuteries, la lecture du lanceur et la notification sont donnés par l'appelant ; launcher.js (ctx.launcher.busy) les branche.
//
// API :
//   opName(running) → « Base · Télécharger (fr, gb) » : le jeu et le verbe de l'opération en mots (la table OPS : les mots que la suite a déjà, ceux de Données pour la base), ses zones ; '' sans opération lisible.
//   busyText(running, t, fmtZ) → « Le poste est occupé : {opération}, depuis {heure}. Votre demande partira dès qu'il aura fini. » ; sans heure : sans « depuis » ; sans opération lisible : « Le poste
//     est occupé par une autre opération. … ». `t` : la traduction du cadre ([fr, …], {jetons}) ; `fmtZ(iso)` : l'heure UTC (frame/lib/time.js).
//   waiter({ free, show, hide, every, timer, life }) → { later(label, run), cancel(), pending() } : LA demande en attente de ce propriétaire (un seul par écran : une nouvelle
//     remplace l'ancienne) ; `later(label, run)` la dit (`show(label, cancel)` : « En attente : {label} » avec « Annuler »), puis interroge `free()` (vrai quand le poste est libre) toutes les
//     `every` ms ; libre : `hide()`, puis `run()` — la demande repart seule ; si `run` rend encore un refus « busy » (status 409 ou reason 'busy'), elle reste en attente. `cancel()` ou la fin
//     de `life` (AbortSignal : le démontage de l'écran) l'abandonne sans rien lancer.
// Les textes (français seul, dette notée SOG-0680) : TX.

// Les mots de chaque opération : { jeu: [mot], verbe: [mot] } ; une table fermée, un jeu ou un verbe inconnu se dit tel que le lanceur le nomme.
const SETS = {
  aircraft: 'Appareils',
  airline: 'Compagnie',
  base: 'Base',
  dfsproc: 'Procédures DFS',
  ground: 'Plan de sol',
  pdf: 'PDF',
  pelican: 'Pelican',
  proc: 'Procédures',
  recette: 'Recette',
  roadmap: 'Feuille de route',
  route: 'Route (RAD, FRA)',
  signalement: 'Signalements',
  state: 'État du poste',
  stats: 'Statistiques',
  vfr: 'Cartes VFR',
  weather: 'Météo',
  xplane: 'X-Plane'
};
const VERBS = {
  build: 'Construire',
  compute: 'Calculer la route',
  coverage: 'Relever la couverture',
  cycle: 'Relever le cycle',
  'ead-fetch': 'Télécharger (EAD)',
  'eaip-fetch': 'Télécharger (eAIP)',
  fetch: 'Télécharger',
  'fra-points': 'Lire les points FRA',
  'import-rad': 'Importer',
  import: 'Importer',
  levels: 'Lire les niveaux',
  lnm: 'Lire Little Navmap',
  migrate: 'Migrer',
  'move-sources': 'Déplacer les sources',
  pickup: 'Prendre le fichier',
  priorities: 'Écrire les priorités',
  publish: 'Publier',
  purge: 'Purger',
  regions: 'Lire les régions',
  registry: 'Lire le registre',
  scan: 'Parcourir',
  state: 'Relever l’état',
  status: 'Relever l’état',
  'ukpkg-fetch': 'Télécharger (Royaume-Uni)',
  update: 'Mettre à jour',
  world: 'Prévision mondiale'
};
const TX = {
  busy: ['Le poste est occupé : {op}{since}. Votre demande partira dès qu’il aura fini.'],
  busyAny: ['Le poste est occupé par une autre opération{since}. Votre demande partira dès qu’il aura fini.'],
  since: [', depuis {t}'],
  since2: [' depuis {t}'],
  waiting: ['En attente : {label}'],
  cancel: ['Annuler']
};
export const WORDS = Object.freeze({
  waiting: TX.waiting,
  cancel: TX.cancel
});

const word = (table, k) => typeof k === 'string' && Object.hasOwn(table, k) ? table[k] : '';
export function opName(running) {
  const r = running && typeof running === 'object' ? running : null;
  if (!r || !r.verb) return '';
  const zones = Array.isArray(r.args?.zones) && r.args.zones.length ? ` (${r.args.zones.slice(0, 12).join(', ')})` : '',
    set = word(SETS, r.set) || (typeof r.set === 'string' ? r.set : ''),
    verb = word(VERBS, r.verb) || r.verb;
  return `${[set, verb].filter(Boolean).join(' · ')}${zones}`;
}
export function busyText(running, t, fmtZ) {
  const r = running && typeof running === 'object' ? running : null,
    op = opName(r),
    iso = r && Number.isFinite(r.started) && r.started > 0 ? new Date(r.started * 1000).toISOString() : '',
    at = iso && typeof fmtZ === 'function' ? fmtZ(iso) : '',
    since = at ? t(op ? TX.since : TX.since2, {
      t: at
    }) : '';
  return op ? t(TX.busy, {
    op,
    since
  }) : t(TX.busyAny, {
    since
  });
}

const refusedBusy = r => !!r && typeof r === 'object' && (r.status === 409 || r.reason === 'busy');
export function waiter({
  free,
  show = () => {},
  hide = () => {},
  every = 5000,
  timer = {
    set: (f, ms) => setTimeout(f, ms),
    clear: id => clearTimeout(id)
  },
  life = null
} = {}) {
  let cur = null; // { label, run, id, token }
  let seq = 0;
  const stop = () => {
    if (cur) timer.clear(cur.id);
    cur = null;
  };
  const cancel = () => {
    if (!cur) return false;
    stop();
    hide();
    return true;
  };
  life?.addEventListener?.('abort', () => {
    stop(); // le démontage : rien n'est lancé, la note est retirée
    hide();
  }, {
    once: true
  });
  const tick = async token => {
    if (!cur || cur.token !== token) return;
    let ok = false;
    try {
      ok = (await free()) === true;
    } catch {
      ok = false;
    }
    if (!cur || cur.token !== token) return; // annulée ou remplacée pendant la lecture
    if (!ok) {
      cur.id = timer.set(() => tick(token), every);
      return;
    }
    const {
      run,
      label
    } = cur;
    stop();
    hide();
    let res;
    try {
      res = await run();
    } catch {
      return; // la demande a échoué pour une autre raison : c'est à l'appelant de la dire, jamais une boucle
    }
    if (refusedBusy(res) && !life?.aborted) later(label, run); // un autre travail a pris la place : encore en attente
  };
  /** Met la demande en attente (la remplace). */
  function later(label, run) {
    stop();
    const token = ++seq;
    cur = {
      label: String(label ?? '').slice(0, 120),
      run,
      token,
      id: 0
    };
    show(cur.label, cancel);
    cur.id = timer.set(() => tick(token), every);
    return {
      cancel
    };
  }
  return {
    later,
    cancel,
    pending: () => cur ? cur.label : null
  };
}
