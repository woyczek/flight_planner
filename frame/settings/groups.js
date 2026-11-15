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
  /** Pastille et ouverture des groupes qui portent une attention : un avertissement ou une erreur dans une de leurs cartes, ou la cible d'une ligne orange du bloc d'état. UN POINT A TOUJOURS SA PHRASE (SOG-0362) : le résumé du pli
   *  dit ce qui est en défaut (« Accès : le jeton expire dans 4 jours ») à la place de sa fréquence, et la carte fautive porte le même point devant son titre ; rouge quand une ligne l'est (un jeton qui expire demain ou a expiré). */
  function markAttention(view) {
    const clip = s => {
        const x = String(s || '').replace(/\s+/g, ' ').trim();
        return x.length > 90 ? `${x.slice(0, 89)}…` : x;
      },
      rows = [...view.querySelectorAll('[data-card="status"] li[data-k]')].filter(li => li.querySelector(
        '.f-status-dot[data-attn]:not([hidden])') && li.querySelector('[data-go^="card:"]'))
      .map(li => ({
        card: goCard(view, li.querySelector('[data-go^="card:"]').dataset.go),
        level: li.querySelector('.f-status-dot').dataset.level || '',
        text: li.dataset.short || li.querySelector('.f-status-txt span')?.textContent || ''
      })).filter(r => r.card);
    const byCard = new Map();
    for (const r of rows)
      if (!byCard.has(r.card)) byCard.set(r.card, r);
    view.querySelectorAll('.f-card').forEach(k => {
      // seulement un avertissement VU : ni caché, ni vide (un `.f-warn` caché ou sans texte allumait le point sans rien dire : SOG-0362)
      const warn = [...k.querySelectorAll('.f-warn, .f-msg[data-kind="err"]')].find(e => !e.hidden && !e.closest('[hidden]') && e
        .textContent.trim());
      if (warn && !byCard.has(k)) byCard.set(k, {
        card: k,
        level: '',
        text: warn.textContent
      });
    });
    const dots = new Set();
    for (const r of byCard.values()) {
      const h2 = r.card.querySelector(':scope > h2');
      if (!h2) continue;
      let d = h2.querySelector(':scope > .f-card-dot');
      if (!d) {
        d = document.createElement('i');
        d.className = 'f-status-dot f-card-dot';
        d.setAttribute('data-attn', '');
        d.setAttribute('aria-hidden', 'true');
        h2.prepend(d);
      }
      r.level ? d.dataset.level = r.level : delete d.dataset.level;
      dots.add(d);
    }
    view.querySelectorAll('.f-card-dot').forEach(d => {
      if (!dots.has(d)) d.remove();
    });
    view.querySelectorAll('details.f-group').forEach(g => {
      const mine = [...byCard.values()].filter(r => g.contains(r.card)),
        on = mine.length > 0,
        dot = g.querySelector(':scope > summary > .f-status-dot'),
        hint = g.querySelector(':scope > summary > .f-ghint');
      dot.hidden = !on;
      const red = mine.find(r => r.level === 'expired' || r.level === 'urgent');
      red ? dot.dataset.level = red.level : delete dot.dataset.level;
      if (hint) {
        if (hint.dataset.hint === undefined) hint.dataset.hint = hint.textContent;
        const first = mine[0],
          why = on ? `${clip(first.card.querySelector(':scope > h2')?.textContent)} : ${clip(first.text)}${mine.length > 1 ? ` (+${mine.length - 1})` : ''}` : '';
        if (hint.textContent !== (why || hint.dataset.hint)) hint.textContent = why || hint.dataset.hint;
        why ? hint.dataset.reason = '' : delete hint.dataset.reason;
      }
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
