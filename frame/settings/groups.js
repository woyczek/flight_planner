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
      help: ['À propos', 'About', 'Über', 'Acerca de'], // une seule porte « Aide » par écran : le « ? » de l'en-tête (9377637d6)
      sync: ['Synchronisation', 'Synchronisation', 'Synchronisierung', 'Sincronización'],
      start: ['Mise en route', 'Getting started', 'Einrichtung', 'Puesta en marcha']
    },
    // ce qui dit la fréquence d'usage d'un groupe, à droite de son titre (SOG-0320)
    groupHint: {
      data: ['une fois par mois', 'once a month', 'einmal im Monat', 'una vez al mes'],
      sync: ['en cas de souci', 'when something is wrong', 'bei Problemen', 'en caso de problema'],
      device: ['sauvegarde · clé météo · réseau local', 'backup · weather key · local network',
        'Sicherung · Wetterschlüssel · lokales Netz', 'copia · clave meteo · red local'
      ],
      start: ['identité, accès, créer ou rejoindre une compagnie', 'identity, access, create or join an airline',
        'Identität, Zugang, Gesellschaft gründen oder beitreten', 'identidad, acceso, crear o unirse a una compañía'
      ],
      admin: ['jetons, accès, mises à jour, pages de réglage', 'tokens, access, updates, setting pages',
        'Token, Zugriff, Updates, Einstellungsseiten', 'tokens, acceso, actualizaciones, páginas de ajuste'
      ]
    },
    groupAttn: ['À regarder', 'Needs attention', 'Bitte ansehen', 'Requiere atención'],
  });

  // Réglages rangés par fréquence d'usage (SOG-0320, maquette `maquette/reglages_usage.html` validée par l'utilisateur le 13/11) : TOUJOURS VISIBLE — le bloc d'état, l'affichage (niveau d'usage,
  // apparence) et la compagnie de l'appareil ; PARFOIS, repliés — Données, Synchronisation, Appareil ; EN PAGE — Administration (une ligne qui ouvre sa page) ; UNE SEULE FOIS, replié tout en bas —
  // Mise en route (identité, accès, créer ou rejoindre une compagnie) ; À propos en dernier. Une carte d'aucun groupe (le bloc d'état, les cartes de circonstance) reste en tête, à plat.
  const GROUPS = [
    ['data', ['usages', 'offline', 'lnmperf']],
    ['sync', ['sync']],
    ['device', ['backup', 'wx', 'lan', 'reset']]
  ];
  const START = ['identity', 'ivao', 'access', 'onboard']; // « Mise en route »
  const FLAT = ['display', 'company']; // toujours visibles, après le bloc d'état
  // l'ordre à plat du niveau Découverte (sept cartes au plus, SPEC § 1) : celui du chemin, inchangé
  const ORDER1 = ['identity', 'ivao', 'access', 'sync', 'usages', 'offline', 'lnmperf', 'backup', 'wx', 'lan', 'display', 'admin',
    'ivaoapp', 'about'
  ];
  const OPEN = new Set(); // groupes ouverts à la main, gardés d'un dessin à l'autre (le temps de la page)
  const WIRED = new WeakSet(); // vues déjà écoutées (toggle, lignes du bloc d'état)
  /** Nom de la carte d'un morceau de HTML (data-card), '' sans. */
  const keyOf = h => (h.match(/data-card="([\w-]+)"/) || [])[1] || '';
  /** Les cartes à plat au niveau Découverte (lvl 1), sinon rangées sous les titres des groupes, repliés sauf ceux ouverts
   *  à la main ; en tête, hors groupes, ce qui n'est d'aucun groupe ; la pastille d'attention et l'ouverture qu'elle
   *  entraîne sont posées après le dessin (markAttention). */
  function arrange(list, t, lvl) {
    const grouped = new Set([...GROUPS.flatMap(g => g[1]), ...START, ...FLAT, 'admin', 'ivaoapp', 'about']),
      top = list.filter(h => h && !grouped.has(keyOf(h))),
      by = k => list.filter(h => h && keyOf(h) === k);
    // Découverte : à plat, dans l'ordre du chemin
    if (lvl === 1) return top.join('') + ORDER1.flatMap(by).join('');
    const fold = (g, keys) => {
      const inG = keys.flatMap(by);
      return inG.length ? `<details class="f-group" data-group="${g}"${OPEN.has(g) ? ' open' : ''}><summary><span>${esc(t(T.groups[g]))}</span>${T.groupHint[g] ? `<span class="f-ghint f-muted">${esc(t(T.groupHint[g]))}</span>` : ''}<i class="f-status-dot" data-attn hidden title="${esc(t(T.groupAttn))}"></i></summary>${inG.join('')}</details>` : '';
    };
    // Administration : trop grosse pour un pli, une LIGNE qui ouvre sa page (`#settings?card=admin`) avec son retour
    const adminRow = by('admin').length ? `<a class="f-group f-grow" data-group="admin" href="#settings?card=admin"><span>${esc(t(T.groups.admin))}</span><span class="f-ghint f-muted">${esc(t(T.groupHint.admin))}</span></a>` : '';
    return top.join('') + FLAT.flatMap(by).join('') + GROUPS.map(([g, keys]) => fold(g, keys)).join('') + adminRow + fold('start',
      START) + by('about').join('');
  }
  /** La carte `key` de la liste, visible (sans son attribut hidden), '' si la liste ne l'a pas : une carte atteinte par
   *  son adresse (#settings?card=…) s'affiche seule. */
  function pick(list, key) {
    const one = k => (list.find(x => x && keyOf(x) === k) || '').replace(/^(<div[^>]*?)\shidden(?=[\s>])/, '$1');
    // la page d'une carte porte aussi celle qui l'accompagne : l'application IVAO sous Administration, créer ou rejoindre sous la compagnie (SOG-0320)
    return one(key) + (key === 'admin' ? one('ivaoapp') : key === 'company' ? one('onboard') : '');
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
