(() => {
  'use strict';
  // Flotte et journal depuis le site de la compagnie (pages publiques Flotte et Log des vols, lues sans connexion ;
  // adresses réglées au premier lancement ou dans Installation › Sources et dossiers, transmises au lanceur) : à l'ouverture
  // d'une page servie par le lanceur, une demande au lanceur (tools/launch.py, /__setup/defa-site) qui, au plus une fois
  // par jour calendaire et si le réglage « automatique » le permet, télécharge la page Flotte et le Log des vols et les
  // passe aux mêmes scripts que le collage (AircraftDB/update_fleet.py, tools/defa_reference.py) : data/references/
  // aircraft_fleet.js et defa_reference.js ; puis les types d'aéronefs inconnus de la base (flotte, journal, appareils
  // individuels) sont complétés en tâche de fond. Une demande par onglet et par session au plus ; résultat en notification
  // flottante quand une mise à jour a eu lieu (à relire : rechargement ; à envoyer : « Synchroniser »).
  // Réglage et mise à jour à la demande : Paramètres › Maintenance › Références et dépendances.
  // Chargé par repository_nav.js sur toutes les pages. API : window.DefaSite = { status(), refresh({ force }),
  //   setAuto(on), PAGES }.
  if (window.DefaSite || !/^https?:$/.test(location.protocol)) return;
  const K = window.RepositoryKit,
    t = row => K?.t ? K.t(row) : row[0],
    tf = (row, v) => K?.tf ? K.tf(row, v) : row[0].replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');
  const notify = (m, k) => window.AppFramework?.notify?.(m, k);
  const PAGES = {
    flotte: {
      name: ['Flotte', 'Fleet', 'Flotte', 'Flota'],
      file: 'aircraft_fleet.js',
      override: 'dataOverride:fleet:v1'
    },
    log: {
      name: ['Journal des vols', 'Flight log', 'Flugbuch', 'Diario de vuelos'],
      file: 'defa_reference.js',
      override: 'dataOverride:defaReference:v1'
    }
  };
  const api = body => fetch(new URL('/__setup/defa-site', location.origin), {
    method: body ? 'POST' : 'GET',
    headers: {
      'X-SOG-Setup': '1',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  }).then(r => r.ok ? r.json() : null).catch(() => null);
  /** Première ligne du compte rendu d'un script (les comptes : appareils, vols, pilotes). */
  const last = r => String(r?.message || '').trim().split('\n')[0];

  /** Notifications d'une passe : pages mises à jour, échecs, version du navigateur qui masque un fichier. */
  function report(s) {
    if (!s?.ran) return;
    const all = Object.entries(s.pages || {}).filter(([p]) => PAGES[p]),
      ok = all.filter(([, r]) => r.ok),
      bad = all.filter(([, r]) => !r.ok);
    if (ok.length) notify(tf([
      'Mis à jour depuis le site DEFA : {l}. Recharger la page pour les lire ; « Synchroniser » pour les envoyer.',
      'Updated from the DEFA website: {l}. Reload the page to read them; “Synchronise” to send them.',
      'Von der DEFA-Website aktualisiert: {l}. Seite neu laden, um sie zu lesen; „Synchronisieren“, um sie zu senden.',
      'Actualizado desde el sitio DEFA: {l}. Recargar la página para leerlos; «Sincronizar» para enviarlos.'
    ], {
      l: ok.map(([p, r]) => `${t(PAGES[p].name)} (${last(r)})`).join(' ; ')
    }), 'ok');
    if (bad.length) notify(tf(['Mise à jour depuis le site DEFA impossible : {l}.', 'Update from the DEFA website failed: {l}.',
      'Aktualisierung von der DEFA-Website fehlgeschlagen: {l}.', 'Actualización desde el sitio DEFA imposible: {l}.'
    ], {
      l: bad.map(([p, r]) => `${t(PAGES[p].name)} — ${last(r)}`).join(' ; ')
    }), 'warn');
    if (s.types?.started) notify(tf(['Types d’aéronefs inconnus ({l}) : passe lancée en tâche de fond (OACI, EUROCONTROL).',
      'Unknown aircraft types ({l}): pass started in the background (ICAO, EUROCONTROL).',
      'Unbekannte Luftfahrzeugtypen ({l}): Durchlauf im Hintergrund gestartet (ICAO, EUROCONTROL).',
      'Tipos de aeronave desconocidos ({l}): pasada iniciada en segundo plano (OACI, EUROCONTROL).'
    ], {
      l: s.types.codes.slice(0, 12).join(' ') + (s.types.codes.length > 12 ? '…' : '')
    }), 'info');
    // une version appliquée dans ce navigateur (Paramétrage › Bases de données) masque le fichier mis à jour
    for (const [p] of ok) {
      let shadow = false;
      try {
        shadow = !!localStorage.getItem(PAGES[p].override);
      } catch {}
      if (shadow) notify(tf([
        '{f} : une version appliquée dans ce navigateur (Paramétrage › Bases de données) masque la mise à jour ; la retirer pour lire le fichier.',
        '{f}: a version applied in this browser (Configuration › Databases) hides the update; remove it to read the file.',
        '{f}: Eine in diesem Browser angewandte Version (Konfiguration › Datenbanken) verdeckt die Aktualisierung; entfernen, um die Datei zu lesen.',
        '{f}: una versión aplicada en este navegador (Configuración › Bases de datos) oculta la actualización; quitarla para leer el archivo.'
      ], {
        f: t(PAGES[p].name)
      }), 'warn');
    }
  }
  /** Adresses des pages Flotte et Log des vols du site de la compagnie réglé (RepositoryNav.vaUrl : réglage local, sinon
   *  défaut de la compagnie de la suite) ; '' : adresse non réglée (le lanceur n'importe rien pour cette page). */
  const pageUrls = () => ({
    flotte: window.RepositoryNav?.vaUrl?.('fleet') || '',
    log: window.RepositoryNav?.vaUrl?.('log') || ''
  });
  /** Une passe (force : même déjà faite aujourd'hui ou réglage coupé) ; état du lanceur, null sans lanceur. */
  async function refresh({
    force = false,
    auto = false
  } = {}) {
    const s = await api({
      refresh: true,
      force,
      auto,
      pages: pageUrls()
    });
    report(s);
    return s;
  }
  // ouverture d'une page : une demande par onglet et par session (le lanceur décide : réglage, une fois par jour)
  try {
    if (!sessionStorage.getItem('defaSiteAuto')) {
      sessionStorage.setItem('defaSiteAuto', '1');
      setTimeout(() => refresh({
        auto: true
      }), 4000);
    }
  } catch {}
  window.DefaSite = {
    PAGES,
    status: () => api(),
    refresh,
    setAuto: on => api({
      auto_enabled: !!on
    })
  };
})();
