(() => {
  'use strict';
  // V3 — Réglages, rangement de l'écran (frame/settings/SPEC.md § 1) : à Découverte, sept cartes à plat au plus (settings.js
  // ne dessine pas les autres) ; à Courant et Complet, les cartes rangées sous sept titres, dans l'ordre du chemin
  // (Identité, Accès, Données, Appareil, Affichage, Administration, Aide), chaque groupe replié sauf s'il porte une
  // attention ; à tout niveau, le bloc d'état et les cartes de circonstance (V2 trouvé, configuration reçue, reprise
  // d'adhésion) en tête, hors groupes ; une ligne du bloc d'état ouvre le groupe de sa carte ; les groupes ouverts à la
  // main le restent d'un dessin à l'autre.
  const {
    esc,
    T
  } = window.SogSettingsKit;

  Object.assign(T, {
    // groupes de cartes (niveaux Courant et Complet : SPEC § 1), dans l'ordre du chemin
    groups: {
      identity: ['Identité', 'Identity', 'Identität', 'Identidad'],
      access: ['Accès', 'Access', 'Zugang', 'Acceso'],
      data: ['Données', 'Data', 'Daten', 'Datos'],
      device: ['Appareil', 'Device', 'Gerät', 'Dispositivo'],
      display: ['Affichage', 'Display', 'Anzeige', 'Visualización'],
      admin: ['Administration', 'Administration', 'Verwaltung', 'Administración'],
      help: ['Aide', 'Help', 'Hilfe', 'Ayuda']
    },
    groupAttn: ['À regarder', 'Needs attention', 'Bitte ansehen', 'Requiere atención'],
  });

  // groupes de cartes, dans l'ordre du chemin (ce qu'on règle une fois en haut) ; une carte d'aucun groupe (le bloc
  // d'état, les cartes de circonstance) reste en tête, à plat
  const GROUPS = [
    ['identity', ['identity']],
    ['access', ['access', 'sync']],
    ['data', ['usages', 'offline', 'lnmperf']],
    ['device', ['backup', 'wx', 'lan']],
    ['display', ['level', 'design']],
    ['admin', ['admin', 'ivaoapp']],
    ['help', ['about']]
  ];
  const OPEN = new Set(); // groupes ouverts à la main, gardés d'un dessin à l'autre (le temps de la page)
  const WIRED = new WeakSet(); // vues déjà écoutées (toggle, lignes du bloc d'état)
  /** Nom de la carte d'un morceau de HTML (data-card), '' sans. */
  const keyOf = h => (h.match(/data-card="([\w-]+)"/) || [])[1] || '';
  /** Les cartes à plat au niveau Découverte (lvl 1), sinon rangées sous les titres des groupes, repliés sauf ceux ouverts
   *  à la main ; en tête, hors groupes, ce qui n'est d'aucun groupe ; la pastille d'attention et l'ouverture qu'elle
   *  entraîne sont posées après le dessin (markAttention). */
  function arrange(list, t, lvl) {
    const grouped = new Set(GROUPS.flatMap(g => g[1])),
      top = list.filter(h => h && !grouped.has(keyOf(h))),
      rest = list.filter(h => h && grouped.has(keyOf(h)));
    // Découverte : à plat, dans l'ordre des groupes (le chemin)
    if (lvl === 1) return top.join('') + GROUPS.flatMap(g => g[1]).flatMap(k => rest.filter(h => keyOf(h) === k)).join('');
    return top.join('') + GROUPS.map(([g, keys]) => {
      const inG = rest.filter(h => keys.includes(keyOf(h)));
      return inG.length ? `<details class="f-group" data-group="${g}"${OPEN.has(g) ? ' open' : ''}><summary><span>${esc(t(T.groups[g]))}</span><i class="f-status-dot" data-attn hidden title="${esc(t(T.groupAttn))}"></i></summary>${inG.join('')}</details>` : '';
    }).join('');
  }
  /** La carte `key` de la liste, visible (sans son attribut hidden), '' si la liste ne l'a pas : une carte atteinte par
   *  son adresse (#settings?card=…) s'affiche seule. */
  function pick(list, key) {
    const h = list.find(x => x && keyOf(x) === key) || '';
    return h.replace(/^(<div[^>]*?)\shidden(?=[\s>])/, '$1');
  }
  /** Carte visée par une ligne du bloc d'état (`card:a,b` : la première présente et non masquée), comme le cadre. */
  function goCard(view, go) {
    return go.slice(5).split(',').map(k => view.querySelector(`[data-card="${k}"]`)).find(x => x && !x.hidden) || null;
  }
  /** Pastille et ouverture des groupes qui portent une attention : un avertissement ou une erreur dans une de leurs cartes,
   *  ou la cible d'une ligne orange du bloc d'état. */
  function markAttention(view) {
    const targets = [...view.querySelectorAll('[data-card="status"] [data-go^="card:"]')].filter(b => b.querySelector(
        '.f-status-dot[data-attn]:not([hidden])'))
      .map(b => goCard(view, b.dataset.go)).filter(Boolean);
    view.querySelectorAll('details.f-group').forEach(g => {
      const on = !!g.querySelector(
          '.f-warn, .f-msg[data-kind="err"]:not(:empty)') ||
        targets.some(k => g.contains(k));
      g.querySelector(':scope > summary > .f-status-dot').hidden = !on;
      if (on) g.open = true;
    });
  }
  /** Une fois par vue : les groupes ouverts ou fermés à la main sont retenus ; une ligne du bloc d'état qui mène à une carte
   *  ouvre d'abord son groupe (écoute en capture : avant le cadre, qui amène ensuite la carte sous l'en-tête). */
  function wireGroups(view) {
    if (WIRED.has(view)) return;
    WIRED.add(view);
    view.addEventListener('toggle', e => {
      const g = e.target;
      if (g instanceof HTMLDetailsElement && g.matches('.f-group') && g.isConnected) g.open ? OPEN.add(g.dataset.group) : OPEN.delete(
        g.dataset.group);
    }, true);
    view.addEventListener('click', e => {
      const b = e.target.closest?.('[data-go^="card:"]'),
        g = b && goCard(view, b.dataset.go)?.closest('details.f-group');
      if (g) g.open = true;
    }, true);
  }

  (window.SogSettingsParts ||= {}).groups = {
    arrange,
    pick,
    markAttention,
    wireGroups
  };
})();
